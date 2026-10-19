import { expect, test } from 'vitest';
import { readAll } from './read-all';
test('owner reads include rows after the default page boundary', async () => {
  const rows = Array.from({ length: 1002 }, (_, id) => ({ id }));
  const result = await readAll(async offset => ({ data: rows.slice(offset, offset + 500), error: null }));
  expect(result.data).toHaveLength(1002);
  expect(result.data[1001]).toEqual({ id: 1001 });
});
test('page errors do not return a silently truncated successful result', async () => {
  const result = await readAll(async () => ({ data: null, error: { message: 'Denied' } }));
  expect(result.error?.message).toBe('Denied');
});