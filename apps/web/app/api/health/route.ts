/**
 * Health check — credential-free liveness endpoint. The Artillery smoke test
 * targets this so the load path needs no OpenAI/Clerk/DB keys. Reports which
 * subsystems are configured without touching them.
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export function GET() {
  // Public liveness only — no infrastructure disclosure (which components are
  // wired is reconnaissance). Detailed readiness belongs behind an internal check.
  return NextResponse.json({
    status: 'ok',
    service: 'personus-web',
    time: new Date().toISOString(),
  });
}
