import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  businessRegistrationSchema,
  type BusinessRegistrationResult,
} from "@/lib/business-registration";

function slugify(name: string) {
  const base = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${base || "negocio"}-${Math.random().toString(16).slice(2, 8)}`;
}

/**
 * Registers a business for the signed-in caller. The owner is always context.userId — never an
 * id from the request — and the account must already exist (sign-up happens in Supabase Auth).
 * Eligibility is read with the caller's own RLS-bound client; the privileged client is loaded
 * only afterwards, for the business row and the role change.
 */
export const registerMyBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => businessRegistrationSchema.parse(data))
  .handler(async ({ data, context }): Promise<BusinessRegistrationResult> => {
    const { supabase, userId } = context;

    // 1. Eligibility: not an admin, and no business yet (one business per account).
    const [roles, existing] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("businesses").select("id").eq("owner_id", userId).limit(1),
    ]);
    if (roles.error || existing.error) return { ok: false, error: "UNAVAILABLE" };
    if (roles.data.some(({ role }) => role === "admin"))
      return { ok: false, error: "ADMIN_ACCOUNT" };
    if (existing.data.length > 0) return { ok: false, error: "ALREADY_HAS_BUSINESS" };

    // 2. Province and category must exist in the official, active lists.
    const [province, category] = await Promise.all([
      supabase
        .from("provinces")
        .select("id, code")
        .eq("code", data.provinceCode)
        .eq("active", true)
        .maybeSingle(),
      supabase
        .from("business_categories")
        .select("code")
        .eq("code", data.category)
        .eq("active", true)
        .maybeSingle(),
    ]);
    if (province.error || category.error) return { ok: false, error: "UNAVAILABLE" };
    if (!province.data) return { ok: false, error: "INVALID_PROVINCE" };
    if (!category.data) return { ok: false, error: "INVALID_CATEGORY" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 3. Business entity, always pending approval and unverified.
    const { data: business, error: businessError } = await supabaseAdmin
      .from("businesses")
      .insert({
        owner_id: userId,
        name: data.businessName,
        slug: slugify(data.businessName),
        type: data.businessType,
        category: category.data.code,
        category_code: category.data.code,
        province: province.data.code,
        province_id: province.data.id,
        description: data.description,
        location: { address: data.location },
        contact: { phone: data.contact },
        status: "pending",
        verified: false,
      })
      .select("id")
      .single();
    if (businessError || !business) return { ok: false, error: "BUSINESS_FAILED" };

    // 4. Business role, only after the business exists. 23505 = role already present.
    const role = data.businessType === "large" ? "business_large" : "business_small";
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role });
    if (roleError && roleError.code !== "23505") {
      const { error: rollbackError } = await supabaseAdmin
        .from("businesses")
        .delete()
        .eq("id", business.id);
      if (rollbackError) {
        console.error("[registerMyBusiness] role failed and business rollback failed", business.id);
      }
      return { ok: false, error: "ROLE_FAILED" };
    }

    // 5. Drop the tourist role. If this fails the account keeps both roles; the business role
    // still takes priority everywhere roles are resolved, so registration stands.
    const { error: touristError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", userId)
      .eq("role", "tourist");
    if (touristError) {
      console.error("[registerMyBusiness] could not remove tourist role", userId);
    }

    return { ok: true };
  });
