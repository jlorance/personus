/**
 * Edge middleware — defense-in-depth auth gate for apps/admin.
 *
 * Architecture
 * ────────────
 * This is the outermost authentication layer, running at the edge before any
 * page code or server action executes. It enforces that a valid Clerk session
 * exists. The role check (`manage AdminSurface`) remains in require-admin.ts
 * at the page/action layer so that layered auth is preserved: edge stops
 * unauthenticated requests, page/action enforces authorization.
 *
 * Credential-free guard
 * ─────────────────────
 * When CLERK_SECRET_KEY is absent (local dev without Clerk keys, health probes,
 * test environments) the middleware is a no-op and passes every request through.
 * The existing page/action gates remain the only auth layer in that case, which
 * is acceptable for a local non-public endpoint. Cloud/preview deploys where
 * :3001 is reachable MUST set CLERK_SECRET_KEY so this gate is active.
 *
 * Testing
 * ───────
 * The no-op path (key absent) is covered by middleware.test.ts. The
 * Clerk-authenticated path requires a live Clerk instance and is verified
 * against the real Clerk tenant — not exercisable in the credential-free
 * local environment.
 */

import { type ClerkMiddlewareAuth, clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export default clerkMiddleware(async (auth: ClerkMiddlewareAuth) => {
  // No-op when Clerk credentials are absent — preserves the credential-free boot.
  if (!process.env.CLERK_SECRET_KEY) {
    return NextResponse.next();
  }

  // Edge enforcement: stop unauthenticated requests before page code runs.
  // auth.protect() redirects to Clerk's sign-in flow for unauthenticated callers.
  // The role check (can('manage', 'AdminSurface')) stays in require-admin.ts.
  await auth.protect();
});

export const config = {
  // Match all routes except Next.js internals (_next/) and static assets.
  // This intentionally broad matcher lets Clerk handle route exclusions via its
  // own publicRoutes/ignoredRoutes config if needed in the future.
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico).*)'],
};
