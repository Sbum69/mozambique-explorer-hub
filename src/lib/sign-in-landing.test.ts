import { beforeEach, describe, expect, it, vi } from "vitest";

// Server rows the landing reads: user_roles and the profile's province (onboarding done).
const db = vi.hoisted(() => ({ roles: [] as string[], province: null as string | null }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      const rows =
        table === "user_roles"
          ? { data: db.roles.map((role) => ({ role })), error: null }
          : { data: { province: db.province }, error: null };
      const q = {
        select: () => q,
        eq: () => (table === "user_roles" ? Promise.resolve(rows) : q),
        maybeSingle: () => Promise.resolve(rows),
      };
      return q;
    },
  },
}));
import { signInLanding } from "./auth";

const user = (returnTo?: string) => ({
  id: "u1",
  user_metadata: returnTo ? { return_to: returnTo } : {},
});

describe("LOGIN-1 after any sign-in, the panel of the account's role", () => {
  beforeEach(() => {
    db.roles = ["tourist"];
    db.province = "maputo";
  });

  it('"Explorar a app" (redirect=/dashboard) opens the panel of each role', async () => {
    expect(await signInLanding(user(), "/dashboard")).toBe("/dashboard");
    db.roles = ["business_small"];
    expect(await signInLanding(user(), "/dashboard")).toBe("/business-dashboard");
    db.roles = ["business_large"];
    expect(await signInLanding(user(), "/dashboard")).toBe("/business-dashboard");
    db.roles = ["tourist", "admin"];
    expect(await signInLanding(user(), "/dashboard")).toBe("/admin");
  });

  it("without a requested page, also the role's panel (no longer the Home)", async () => {
    expect(await signInLanding(user())).toBe("/dashboard");
    db.roles = ["admin"];
    expect(await signInLanding(user())).toBe("/admin");
  });

  it("a traveller without onboarding does it first (it then ends in the panel)", async () => {
    db.province = null;
    expect(await signInLanding(user(), "/dashboard")).toBe("/onboarding");
  });

  it("a new account goes back to where sign-up started, even when confirmed elsewhere", async () => {
    db.province = null;
    expect(await signInLanding(user("/business-register"))).toBe("/business-register");
    expect(await signInLanding(user("/dashboard"))).toBe("/onboarding");
  });

  it("keeps any other allow-listed page the visitor asked for", async () => {
    expect(await signInLanding(user(), "/map")).toBe("/map");
    db.roles = ["admin"];
    expect(await signInLanding(user(), "/favorites")).toBe("/favorites");
  });
});
