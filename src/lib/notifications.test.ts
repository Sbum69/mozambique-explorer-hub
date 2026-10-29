import { describe, expect, it } from "vitest";

import {
  NOTIFICATION_TYPE_LABEL,
  formatNotificationDate,
  mapNotification,
  notificationTypeLabel,
  safeInternalLink,
  unreadAfterMarkRead,
  type RawNotification,
} from "./notifications";

const raw = (over: Partial<RawNotification> = {}): RawNotification => ({
  id: "n1",
  type: "booking",
  title_pt: "Reserva confirmada",
  title_en: "Booking confirmed",
  body_pt: "A tua reserva foi confirmada.",
  body_en: "Your booking was confirmed.",
  link: "/bookings",
  read_at: null,
  created_at: "2026-10-12T14:30:00Z",
  ...over,
});

describe("notification mapping", () => {
  it("keeps both languages, the link and the unread state", () => {
    expect(mapNotification(raw())).toEqual({
      id: "n1",
      type: "booking",
      title: { pt: "Reserva confirmada", en: "Booking confirmed" },
      body: { pt: "A tua reserva foi confirmada.", en: "Your booking was confirmed." },
      link: "/bookings",
      read: false,
      createdAt: "2026-10-12T14:30:00Z",
    });
  });

  it("shows the Portuguese text when English is missing (never empty)", () => {
    const n = mapNotification(raw({ title_en: null, body_en: null }));
    expect(n.title.en).toBe("Reserva confirmada");
    expect(n.body.en).toBe("A tua reserva foi confirmada.");
  });

  it("is read once read_at is set", () => {
    expect(mapNotification(raw({ read_at: "2026-10-12T15:00:00Z" })).read).toBe(true);
  });
});

describe("notification links", () => {
  it("keeps in-app paths", () => {
    expect(safeInternalLink("/bookings")).toBe("/bookings");
    expect(safeInternalLink("/itinerary/11111111-1111-4111-8111-111111111111")).toBe(
      "/itinerary/11111111-1111-4111-8111-111111111111",
    );
  });

  it("drops external, protocol-relative and empty links", () => {
    expect(safeInternalLink("https://evil.example")).toBeNull();
    expect(safeInternalLink("//evil.example")).toBeNull();
    expect(safeInternalLink("javascript:alert(1)")).toBeNull();
    expect(safeInternalLink("")).toBeNull();
    expect(safeInternalLink(null)).toBeNull();
    expect(mapNotification(raw({ link: "//evil.example" })).link).toBeNull();
  });
});

describe("notification labels and dates", () => {
  it("labels every type in PT and EN", () => {
    for (const [type, label] of Object.entries(NOTIFICATION_TYPE_LABEL)) {
      expect(label.pt.trim(), type).not.toBe("");
      expect(label.en.trim(), type).not.toBe("");
      expect(label.en, type).not.toMatch(/[ãõçáéíóúâêô]/i);
    }
  });

  it("falls back to 'system' for an unknown type", () => {
    expect(notificationTypeLabel("unknown", "pt")).toBe("Sistema");
    expect(notificationTypeLabel("booking", "en")).toBe("Booking");
  });

  it("formats the date with the reader's locale (pt-PT / en-GB)", () => {
    // Month names depend on the runtime's ICU data, so compare with the locale itself.
    const iso = "2026-10-12T14:30:00Z";
    const opts = { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" } as const;
    expect(formatNotificationDate(iso, "pt")).toBe(new Date(iso).toLocaleString("pt-PT", opts));
    expect(formatNotificationDate(iso, "en")).toBe(new Date(iso).toLocaleString("en-GB", opts));
    expect(formatNotificationDate(iso, "pt")).toMatch(/12/);
  });
});

describe("unread count", () => {
  it("goes down by one and never below zero", () => {
    expect(unreadAfterMarkRead(3)).toBe(2);
    expect(unreadAfterMarkRead(0)).toBe(0);
  });
});
