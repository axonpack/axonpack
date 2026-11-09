/**
 * Runs `task` on every item, `atOnce` at a time, from one queue. After the first failure no new
 * item starts, the ones on the way are waited for, and then the first error is thrown. So a caller
 * that cleans up after a failure never races a task still running.
 */
export async function forEachAtOnce<T>(
  items: readonly T[],
  atOnce: number,
  task: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0;
  const errors: unknown[] = [];
  const worker = async () => {
    while (errors.length === 0 && next < items.length) {
      const item = items[next++];
      try {
        await task(item);
      } catch (error) {
        errors.push(error);
      }
    }
  };
  await Promise.all(Array.from({ length: atOnce }, worker));
  if (errors.length > 0) throw errors[0];
}
