/**
 * Runs an async function but guarantees the returned promise does not settle
 * before `minMs` has elapsed, regardless of how fast `fn` resolves or rejects.
 *
 * This is used to pad the perceived duration of loading UI (e.g. a full-screen
 * overlay) so it never "flashes" for actions that finish almost instantly,
 * without ever slowing down the underlying async call itself — the real
 * request always starts immediately and runs at its own pace, only the
 * resolution of the returned promise is delayed to the minimum duration.
 */
export async function withMinDuration<T>(
  fn: () => Promise<T>,
  minMs = 1000,
): Promise<T> {
  const startedAt = Date.now();

  const settle = async (): Promise<void> => {
    const elapsed = Date.now() - startedAt;
    const remaining = minMs - elapsed;

    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  };

  try {
    const result = await fn();
    await settle();
    return result;
  } catch (error) {
    await settle();
    throw error;
  }
}
