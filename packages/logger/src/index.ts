/**
 * Structured logger with light PII redaction.
 *
 * The single sanctioned console sink in the codebase — Biome forbids `console.*`
 * everywhere else so all logging funnels through here. Emits JSON lines with a
 * level, message, and structured context. Common PII-ish keys are redacted
 * before serialization.
 */

type Level = 'debug' | 'info' | 'warn' | 'error';

const LEVEL_ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const REDACT_KEYS = new Set([
  'email',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'secret',
  'authorization',
  'phone',
  'ssn',
]);

function threshold(): number {
  const raw = (process.env.MASTRA_LOG_LEVEL ?? process.env.LOG_LEVEL ?? 'info').toLowerCase();
  return LEVEL_ORDER[(raw as Level) in LEVEL_ORDER ? (raw as Level) : 'info'];
}

function redact(ctx: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(ctx)) {
    out[k] = REDACT_KEYS.has(k) ? '[redacted]' : v;
  }
  return out;
}

function emit(level: Level, ctxOrMsg: Record<string, unknown> | string, maybeMsg?: string): void {
  if (LEVEL_ORDER[level] < threshold()) return;
  const ctx = typeof ctxOrMsg === 'string' ? {} : redact(ctxOrMsg);
  const msg = typeof ctxOrMsg === 'string' ? ctxOrMsg : (maybeMsg ?? '');
  const line = JSON.stringify({ level, msg, ...ctx, ts: new Date().toISOString() });
  (level === 'error' ? console.error : level === 'warn' ? console.warn : console.log)(line);
}

export const logger = {
  debug: (ctx: Record<string, unknown> | string, msg?: string) => emit('debug', ctx, msg),
  info: (ctx: Record<string, unknown> | string, msg?: string) => emit('info', ctx, msg),
  warn: (ctx: Record<string, unknown> | string, msg?: string) => emit('warn', ctx, msg),
  error: (ctx: Record<string, unknown> | string, msg?: string) => emit('error', ctx, msg),
};

export type Logger = typeof logger;
