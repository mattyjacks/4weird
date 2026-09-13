/**
 * Fail-open backend wrapper (remastery axiom 3).
 *
 * Unreachable AI/compute backends must never brick the caller: race the
 * primary against a timeout and fall back on throw/reject/timeout.
 * This helper never throws itself.
 */

export interface BackendResult<T> {
  ok: boolean;
  result?: T;
  error?: string;
  fallbackUsed: boolean;
}

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function runWithTimeout<T>(fn: () => Promise<T> | T, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`primary timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    Promise.resolve()
      .then(() => fn())
      .then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err: unknown) => {
          clearTimeout(timer);
          reject(err);
        },
      );
  });
}

export async function withFailover<T>(
  primary: () => Promise<T> | T,
  fallback: () => Promise<T> | T,
  timeoutMs = 8000,
): Promise<BackendResult<T>> {
  try {
    const result = await runWithTimeout(primary, timeoutMs);
    return { ok: true, result, fallbackUsed: false };
  } catch (primaryErr: unknown) {
    const primaryMessage = messageOf(primaryErr);
    try {
      const result = await fallback();
      return { ok: true, result, fallbackUsed: true };
    } catch (fallbackErr: unknown) {
      return {
        ok: false,
        fallbackUsed: true,
        error: `${primaryMessage}; fallback: ${messageOf(fallbackErr)}`,
      };
    }
  }
}
