import { describe, expect, it } from "vitest";

import { LEGAL_ENTITY, SUPPORT_EMAIL } from "./app-info";
import { SUPPORT_TXT } from "./page-texts";
import { supportContacts } from "./support";

describe("support section (menu)", () => {
  it("links the support email in force (apoio@exploreekaya.com)", () => {
    const c = supportContacts();
    expect(SUPPORT_EMAIL).toBe("apoio@exploreekaya.com");
    expect(c.email).toBe(SUPPORT_EMAIL);
    expect(c.mailto).toBe(`mailto:${SUPPORT_EMAIL}`);
  });

  it("shows no phone while the legal entity publishes none (nothing invented)", () => {
    expect(LEGAL_ENTITY.phone).toBeNull();
    expect(supportContacts().phone).toBeNull();
    expect(supportContacts("a@b.c", "   ").phone).toBeNull();
  });

  it("shows the phone with a tel: link when one is published", () => {
    expect(supportContacts("a@b.c", "+258 84 123 4567").phone).toEqual({
      label: "+258 84 123 4567",
      tel: "tel:+258841234567",
    });
  });

  it("has accessible names in PT and EN that include the contact", () => {
    for (const lang of ["pt", "en"] as const) {
      expect(SUPPORT_TXT[lang].emailLabel(SUPPORT_EMAIL)).toContain(SUPPORT_EMAIL);
      expect(SUPPORT_TXT[lang].phoneLabel("+258 1")).toContain("+258 1");
    }
    expect(SUPPORT_TXT.pt.title).toBe("Suporte");
    expect(SUPPORT_TXT.en.title).toBe("Support");
  });
});
