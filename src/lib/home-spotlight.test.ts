import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createSpotlight, SPOTLIGHT_IDLE_MS, type SpotlightStore } from "./home-spotlight";

function memoryStore(): SpotlightStore {
  let seen = false;
  return { seen: () => seen, markSeen: () => void (seen = true) };
}

describe("home spotlight", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("turns on after 5 s without scrolling inside the zone", () => {
    const onChange = vi.fn();
    const s = createSpotlight({ onChange, store: memoryStore() });
    s.setInZone(true);
    vi.advanceTimersByTime(SPOTLIGHT_IDLE_MS - 1);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("restarts the count on every scroll", () => {
    const onChange = vi.fn();
    const s = createSpotlight({ onChange, store: memoryStore() });
    s.setInZone(true);
    vi.advanceTimersByTime(4000);
    s.onScroll();
    vi.advanceTimersByTime(4000);
    expect(onChange).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1000);
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("never starts outside the zone", () => {
    const onChange = vi.fn();
    const s = createSpotlight({ onChange, store: memoryStore() });
    s.onScroll();
    vi.advanceTimersByTime(SPOTLIGHT_IDLE_MS * 3);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("scrolling again ends it, and it happens only once per visit", () => {
    const onChange = vi.fn();
    const s = createSpotlight({ onChange, store: memoryStore() });
    s.setInZone(true);
    vi.advanceTimersByTime(SPOTLIGHT_IDLE_MS);
    s.onScroll();
    expect(onChange).toHaveBeenLastCalledWith(false);
    vi.advanceTimersByTime(SPOTLIGHT_IDLE_MS * 3);
    s.setInZone(false);
    s.setInZone(true);
    vi.advanceTimersByTime(SPOTLIGHT_IDLE_MS * 3);
    expect(onChange.mock.calls).toEqual([[true], [false]]);
  });

  it("does not repeat in a new page of the same visit (shared store)", () => {
    const store = memoryStore();
    const first = vi.fn();
    const a = createSpotlight({ onChange: first, store });
    a.setInZone(true);
    vi.advanceTimersByTime(SPOTLIGHT_IDLE_MS);
    a.dispose();
    const second = vi.fn();
    const b = createSpotlight({ onChange: second, store });
    b.setInZone(true);
    vi.advanceTimersByTime(SPOTLIGHT_IDLE_MS * 2);
    expect(first).toHaveBeenCalledWith(true);
    expect(second).not.toHaveBeenCalled();
  });

  it("leaving the zone cancels the count and ends the spotlight", () => {
    const onChange = vi.fn();
    const s = createSpotlight({ onChange, store: memoryStore() });
    s.setInZone(true);
    vi.advanceTimersByTime(3000);
    s.setInZone(false);
    vi.advanceTimersByTime(SPOTLIGHT_IDLE_MS);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("waits while the tab is hidden", () => {
    const onChange = vi.fn();
    let visible = false;
    const s = createSpotlight({ onChange, store: memoryStore(), isVisible: () => visible });
    s.setInZone(true);
    vi.advanceTimersByTime(SPOTLIGHT_IDLE_MS);
    expect(onChange).not.toHaveBeenCalled();
    visible = true;
    vi.advanceTimersByTime(SPOTLIGHT_IDLE_MS);
    expect(onChange).toHaveBeenCalledWith(true);
  });
});
