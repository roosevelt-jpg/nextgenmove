/** Reject a promise if it does not settle within `ms`. */
export async function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label = "operation",
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  // Swallow late settle/reject so a timed-out Firestore call cannot crash
  // the serverless isolate with an unhandled rejection (exit 128).
  const guarded = promise.then(
    (value) => ({ ok: true as const, value }),
    (error: unknown) => ({ ok: false as const, error }),
  );

  try {
    const result = await Promise.race([
      guarded,
      new Promise<{ ok: false; error: Error }>((resolve) => {
        timer = setTimeout(
          () => resolve({ ok: false, error: new Error(`${label}_timeout`) }),
          ms,
        );
      }),
    ]);

    if (result.ok) {
      return result.value;
    }
    throw result.error instanceof Error
      ? result.error
      : new Error(String(result.error));
  } finally {
    if (timer) clearTimeout(timer);
  }
}
