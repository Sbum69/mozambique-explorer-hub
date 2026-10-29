import { expect, test } from "vitest";
import { readAll } from "./read-all";
test("owner reads include rows after the default page boundary", async () => {
  const rows = Array.from({ length: 1002 }, (_, id) => ({ id }));
  const result = await readAll(async (offset) => ({
    data: rows.slice(offset, offset + 500),
    error: null,
  }));
  expect(result.data).toHaveLength(1002);
  expect(result.data[1001]).toEqual({ id: 1001 });
});
test("page errors do not return a silently truncated successful result", async () => {
  const result = await readAll(async () => ({ data: null, error: { message: "Denied" } }));
  expect(result.error?.message).toBe("Denied");
});
test("a failure after a full page remains an error, not a complete history", async () => {
  const rows = Array.from({ length: 500 }, (_, id) => ({ id }));
  const result = await readAll(async (offset) =>
    offset === 0
      ? { data: rows, error: null }
      : { data: null, error: { message: "Second page denied" } },
  );
  expect(result.data).toHaveLength(500);
  expect(result.error?.message).toBe("Second page denied");
});
