/**
 * Health check — credential-free liveness endpoint. The Artillery smoke test
 * targets this so the load path needs no OpenAI/Clerk/DB keys. Reports which
 * subsystems are configured without touching them.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'personus-web',
    time: new Date().toISOString(),
    configured: {
      database: Boolean(process.env.DATABASE_URL),
      auth: (process.env.AUTH_PROVIDER ?? 'clerk') && Boolean(process.env.CLERK_SECRET_KEY),
      flags: process.env.FLAGS_PROVIDER ?? 'db',
      openai: Boolean(process.env.OPENAI_API_KEY),
    },
  });
}
