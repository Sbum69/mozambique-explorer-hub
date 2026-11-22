import { describe, expect, it, vi } from "vitest";
import { UPSTREAM_RETRY_MS, createUpstreamGuard } from "./upstream-guard";

type R = { status: "ok" | "unavailable" };
const ok: R = { status: "ok" };
const down: R = { status: "unavailable" };
const fallback = (): R => ({ status: "unavailable" });

function setup() {
  let t = 1_000;
  const guard = createUpstreamGuard<R>(
    (r) => r.status === "ok",
    UPSTREAM_RETRY_MS,
    () => t,
  );
  return { guard, advance: (ms: number) => (t += ms) };
}

describe("createUpstreamGuard", () => {
  it("shares one in-flight request between concurrent callers", async () => {
    const { guard } = setup();
    let resolve!: (v: R) => void;
    const fetcher = vi.fn(() => new Promise<R>((r) => (resolve = r)));
    const a = guard.run(fetcher, fallback);
    const b = guard.run(fetcher, fallback);
    resolve(ok);
    expect(await a).toBe(ok);
    expect(await b).toBe(ok);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("after a failed answer, serves the fallback without calling out until the pause ends", async () => {
    const { guard, advance } = setup();
    const fetcher = vi.fn(async () => down);
    expect(await guard.run(fetcher, fallback)).toBe(down);
    advance(UPSTREAM_RETRY_MS - 1);
    expect(await guard.run(fetcher, fallback)).toEqual(down);
    expect(fetcher).toHaveBeenCalledTimes(1);
    advance(1);
    await guard.run(fetcher, fallback);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("a thrown error also starts the pause and is passed on", async () => {
    const { guard } = setup();
    const fetcher = vi.fn(async (): Promise<R> => {
      throw new Error("boom");
    });
    await expect(guard.run(fetcher, fallback)).rejects.toThrow("boom");
    expect(await guard.run(fetcher, fallback)).toEqual(down);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("a good answer never pauses: the next call goes out again (the caller caches it)", async () => {
    const { guard } = setup();
    const fetcher = vi.fn(async () => ok);
    await guard.run(fetcher, fallback);
    await guard.run(fetcher, fallback);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
