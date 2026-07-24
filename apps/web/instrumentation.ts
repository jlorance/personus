/**
 * Next.js instrumentation — runs once when the server process boots (not at
 * build time, and not in the Edge runtime). We use it to fail fast on a broken
 * environment configuration instead of surfacing cryptic errors on first request.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { validateEnv } = await import('@personus/env');
    validateEnv();
  }
}
