import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

import type { Database } from "@/integrations/supabase/types";
import { AUTH_CALLBACK_PATH, sanitizeCallbackUrl } from "@/lib/app-url";

const schema = z.object({
  businessName: z.string().trim().min(2),
  businessType: z.enum(["small", "large"]),
  /** business_categories.code — free text is rejected by the database reference. */
  category: z.string().trim().min(1),
  /** provinces.code — the province must already exist. */
  provinceCode: z.string().trim().min(1),
  location: z.string().trim().min(1),
  description: z.string().trim().min(1),
  contact: z.string().trim().min(1),
  displayName: z.string().trim().min(2),
  email: z.string().trim().email(),
  password: z.string().min(6),
  /** Optional public callback URL; validated server-side, never trusted as-is. */
  redirectTo: z.string().max(300).optional(),
});

export interface BusinessRegistrationResult {
  ok: boolean;
  error?: string;
  needsConfirmation?: boolean;
}

function slugify(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "negocio"}-${Math.random().toString(16).slice(2, 8)}`;
}

function signupErrorMessage(message: string) {
  const normalized = message.toLowerCase();
  if (normalized.includes("already registered") || normalized.includes("already been registered")) {
    return "Este email já está registado. Entra na tua conta e registamos o negócio a partir dela.";
  }
  if (normalized.includes("valid email")) return "Introduz um email válido.";
  const tooShort = normalized.includes("at least 6 characters") || (normalized.includes("password") && normalized.includes("characters"));
  const pwned = normalized.includes("known to be weak") || normalized.includes("easy to guess") || normalized.includes("pwned");
  if (pwned && tooShort) return "Usa pelo menos 6 caracteres e escolhe uma palavra-passe diferente: esta aparece em fugas de dados conhecidas.";
  if (pwned) return "Esta palavra-passe aparece em fugas de dados conhecidas. Escolhe outra.";
  if (tooShort) return "A palavra-passe precisa de pelo menos 6 caracteres.";
  return "Não foi possível criar a conta. Tenta novamente.";
}

/**
 * Real business registration.
 * The password is used exclusively to create the Supabase Auth account
 * (keeping the project's password rules and email confirmation intact);
 * it is never stored in profiles, businesses, logs or local storage.
 */
export const registerBusinessAccount = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<BusinessRegistrationResult> => {
    const SUPABASE_URL = process.env["SUPABASE_URL"]!;
    const SUPABASE_PUBLISHABLE_KEY = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const configuredSite = process.env["SITE_URL"] ?? null;
    // Configured SITE_URL wins; otherwise only a sanitized public callback from the client.
    const SITE_URL =
      sanitizeCallbackUrl(configuredSite ? `${new URL(configuredSite).origin}${AUTH_CALLBACK_PATH}` : undefined, configuredSite) ??
      (configuredSite ? undefined : sanitizeCallbackUrl(data.redirectTo, null));

    const publicClient = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.delete("Authorization");
          headers.set("apikey", SUPABASE_PUBLISHABLE_KEY);
          return fetch(input, { ...init, headers });
        },
      },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. Auth account (password policy + confirmation email handled by Supabase).
    const { data: signUp, error: signUpError } = await publicClient.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        ...(SITE_URL ? { emailRedirectTo: SITE_URL } : {}),
        data: { display_name: data.displayName, username: data.email.split("@")[0] },
      },
    });
    if (signUpError) return { ok: false, error: signupErrorMessage(signUpError.message) };

    const userId = signUp.user?.id;
    if (!userId) return { ok: false, error: "Não foi possível criar a conta. Tenta novamente." };
    if (signUp.user && signUp.user.identities && signUp.user.identities.length === 0) {
      return {
        ok: false,
        error: "Este email já está registado. Entra na tua conta e registamos o negócio a partir dela.",
      };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 2. Profile is created by the on_auth_user_created trigger; only top it up.
    await supabaseAdmin.from("profiles").update({ display_name: data.displayName }).eq("id", userId);

    // 3. One business per account.
    const { data: existing } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (existing) {
      return { ok: false, error: "Esta conta já tem um negócio registado." };
    }

    // 4. Province and category must exist in the official lists.
    const [{ data: province }, { data: categoryRow }] = await Promise.all([
      supabaseAdmin.from("provinces").select("id, code").eq("code", data.provinceCode).eq("active", true).maybeSingle(),
      supabaseAdmin.from("business_categories").select("code").eq("code", data.category).eq("active", true).maybeSingle(),
    ]);
    if (!province) return { ok: false, error: "Escolhe uma província válida da lista." };
    if (!categoryRow) return { ok: false, error: "Escolhe uma categoria válida da lista." };

    // 5. Business entity, always pending approval.
    const { error: businessError } = await supabaseAdmin.from("businesses").insert({
      owner_id: userId,
      name: data.businessName,
      slug: slugify(data.businessName),
      type: data.businessType === "large" ? "large" : "small",
      category: categoryRow.code,
      category_code: categoryRow.code,
      province: province.code,
      province_id: province.id,
      description: data.description,
      location: { address: data.location },
      contact: { phone: data.contact },
      status: "pending",
      verified: false,
    });
    if (businessError) {
      return { ok: false, error: "A conta foi criada, mas o negócio não. Entra e tenta novamente." };
    }

    // 5. Role, decided on the server only.
    const role = data.businessType === "large" ? "business_large" : "business_small";
    await supabaseAdmin.from("user_roles").insert({ user_id: userId, role });
    await supabaseAdmin.from("user_roles").delete().eq("user_id", userId).eq("role", "tourist");

    return { ok: true, needsConfirmation: signUp.session === null };
  });
