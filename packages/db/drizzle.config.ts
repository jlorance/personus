import { defineConfig } from 'drizzle-kit';

// drizzle-kit runs as a separate child process and does not pick up the app's
// env autoloading. Load .env(.local) explicitly so `bun run db:migrate` works
// without the caller exporting env first.
for (const f of ['.env.local', '.env']) {
  try {
    process.loadEnvFile(f);
  } catch {
    // optional — CI sets env directly
  }
}

/**
 * drizzle-kit reaches Neon over the WebSocket driver, which can't talk to the
 * pooled endpoint. Prefer the explicit unpooled URL; otherwise rewrite the
 * pooled URL to its direct equivalent (drop "-pooler", strip channel_binding).
 */
function resolveUnpooledUrl(): string {
  const explicit = process.env.DATABASE_URL_UNPOOLED;
  if (explicit) return explicit;
  const pooled = process.env.DATABASE_URL;
  if (!pooled) {
    throw new Error('drizzle-kit needs DATABASE_URL_UNPOOLED (preferred) or DATABASE_URL');
  }
  return pooled.replace('-pooler.', '.').replace(/[&?]channel_binding=[^&]*/g, '');
}

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: { url: resolveUnpooledUrl() },
  verbose: true,
  strict: true,
});
