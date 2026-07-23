/**
 * Wall-clock timeout wrapper for external calls (LLM, embeddings, DB).
 *
 * Every agent `generate()`/`stream()` and outbound network call should be
 * bounded so a hung upstream can't pin a serverless function open. Durations
 * are env-tunable with safe defaults.
 */

export class TimeoutError extends Error {
  constructor(label: string, ms: number) {
    super(`Operation "${label}" exceeded ${ms}ms timeout`);
    this.name = 'TimeoutError';
  }
}

function envMs(key: string, fallback: number): number {
  const raw = process.env[key];
  const n = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const TIMEOUTS = {
  get llm() {
    return envMs('TIMEOUT_LLM_MS', 60_000);
  },
  get embed() {
    return envMs('TIMEOUT_EMBED_MS', 30_000);
  },
  get db() {
    return envMs('TIMEOUT_DB_MS', 5_000);
  },
} as const;

/**
 * Race a promise against a timeout. Rejects with TimeoutError if `ms` elapses
 * first. Note: the underlying work is not cancelled — this bounds the caller's
 * wait, not the upstream compute.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new TimeoutError(label, ms)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer)) as Promise<T>;
}
