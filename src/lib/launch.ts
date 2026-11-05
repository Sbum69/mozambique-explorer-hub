import { supabase } from "@/integrations/supabase/client";
import { APP_VERSION } from "@/lib/app-info";
import type { BusinessMissing, ExperienceMissing, Readiness } from "@/lib/content";

/** Launch preparation (0057): Admin → "Estado do lançamento" and the simple error log. */

export interface LaunchStatus {
  minBusinesses: number;
  minExperiences: number;
  approvedBusinesses: number;
  activeExperiences: number;
  pendingLeads: number;
  placementsWaiting: number;
  adminsWithout2fa: number;
  errors7d: number;
  readAt: string;
  businesses: {
    id: string;
    name: string;
    status: string;
    hasOwner: boolean;
    missing: BusinessMissing[];
    experiences: { id: string; title: string; active: boolean; missing: ExperienceMissing[] }[];
  }[];
}

type Raw = {
  min_businesses: number;
  min_experiences: number;
  approved_businesses: number;
  active_experiences: number;
  pending_leads: number;
  placements_waiting: number;
  admins_without_2fa: number;
  errors_7d: number;
  read_at: string;
  businesses: {
    id: string;
    name: string;
    status: string;
    has_owner: boolean;
    missing: BusinessMissing[] | null;
    experiences: {
      id: string;
      title: string;
      active: boolean;
      missing: ExperienceMissing[] | null;
    }[];
  }[];
};

export function launchStatusFromRaw(d: Raw): LaunchStatus {
  return {
    minBusinesses: d.min_businesses,
    minExperiences: d.min_experiences,
    approvedBusinesses: Number(d.approved_businesses),
    activeExperiences: Number(d.active_experiences),
    pendingLeads: Number(d.pending_leads ?? 0),
    placementsWaiting: Number(d.placements_waiting ?? 0),
    adminsWithout2fa: Number(d.admins_without_2fa),
    errors7d: Number(d.errors_7d),
    readAt: d.read_at,
    businesses: (d.businesses ?? []).map((b) => ({
      id: b.id,
      name: b.name,
      status: b.status,
      hasOwner: b.has_owner,
      missing: b.missing ?? [],
      experiences: (b.experiences ?? []).map((e) => ({ ...e, missing: e.missing ?? [] })),
    })),
  };
}

export async function fetchLaunchStatus(): Promise<LaunchStatus> {
  const { data, error } = await supabase.rpc("admin_launch_status");
  if (error) throw new Error(error.message);
  return launchStatusFromRaw(data as unknown as Raw);
}

export type LaunchCheck = "businesses" | "experiences" | "admins2fa" | "leads" | "placements";

/** Checks that block the launch (minimum content, every admin with 2FA) and the to-do counters. */
export function launchChecks(
  s: LaunchStatus,
): { key: LaunchCheck; ok: boolean; blocking: boolean }[] {
  return [
    { key: "businesses", ok: s.approvedBusinesses >= s.minBusinesses, blocking: true },
    { key: "experiences", ok: s.activeExperiences >= s.minExperiences, blocking: true },
    { key: "admins2fa", ok: s.adminsWithout2fa === 0, blocking: true },
    { key: "leads", ok: s.pendingLeads === 0, blocking: false },
    { key: "placements", ok: s.placementsWaiting === 0, blocking: false },
  ];
}

/** Readiness shape for ContentChecklist, from the launch status of one business. */
export const toReadiness = (b: LaunchStatus["businesses"][number]): Readiness => ({
  businessId: b.id,
  missing: b.missing,
  warnings: [
    ...(b.status !== "approved" ? (["not_approved"] as const) : []),
    ...(!b.hasOwner ? (["no_owner"] as const) : []),
  ],
  experiences: b.experiences.map((e) => ({
    id: e.id,
    titlePt: e.title,
    active: e.active,
    missing: e.missing,
  })),
});

export interface AppError {
  id: string;
  kind: string;
  route: string;
  message: string;
  release: string | null;
  createdAt: string;
}

export async function fetchAppErrors(limit = 100): Promise<AppError[]> {
  const { data, error } = await supabase
    .from("app_errors")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((e) => ({
    id: e.id,
    kind: e.kind,
    route: e.route,
    message: e.message,
    release: e.release,
    createdAt: e.created_at,
  }));
}

// ---------------------------------------------------------------------------------------------
// Client error logger (production only). The database masks personal data again.
// ---------------------------------------------------------------------------------------------

const MAX_PER_PAGE_LOAD = 5;

/** Message to log, or null to skip (noise from extensions, cancelled requests, etc.). */
export function errorMessage(reason: unknown): string | null {
  const m =
    reason instanceof Error
      ? `${reason.name}: ${reason.message}`
      : typeof reason === "string"
        ? reason
        : null;
  if (!m) return null;
  if (
    /ResizeObserver loop|AbortError|chrome-extension:|moz-extension:|Load failed|NetworkError/i.test(
      m,
    )
  )
    return null;
  return m.slice(0, 300);
}

export function installErrorLogger(): () => void {
  if (typeof window === "undefined" || import.meta.env.DEV) return () => undefined;
  const seen = new Set<string>();
  const send = (reason: unknown) => {
    const message = errorMessage(reason);
    if (!message || seen.has(message) || seen.size >= MAX_PER_PAGE_LOAD) return;
    seen.add(message);
    void supabase
      .rpc("log_app_error", {
        _kind: "client",
        _route: window.location.pathname,
        _message: message,
        _release: APP_VERSION,
      })
      .then(
        () => undefined,
        () => undefined,
      );
  };
  const onError = (e: ErrorEvent) => send(e.error ?? e.message);
  const onRejection = (e: PromiseRejectionEvent) => send(e.reason);
  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
  };
}
