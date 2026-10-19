/** Fetch every page without relying on the Data API's default row cap. */
export async function readAll<T>(page: (offset: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const data: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const result = await page(offset);
    if (result.error) return { data, error: result.error };
    data.push(...(result.data ?? []));
    if ((result.data?.length ?? 0) < 500) return { data, error: null };
  }
}
