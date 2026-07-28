/**
 * Unit tests for apps/admin/middleware.ts
 *
 * What we can test locally:
 *   - The guard: when CLERK_SECRET_KEY is absent the middleware is a no-op.
 *
 * What requires a live Clerk instance (verified separately):
 *   - auth.protect() actually redirects an unauthenticated request.
 *   - A signed-in user is passed through to the page layer.
 *
 * The mock below lets us exercise our handler code without real Clerk credentials.
 * It captures the `protect` spy so individual tests can assert whether the
 * auth-enforcement branch was entered.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';

// ---------- mock: @clerk/nextjs/server ----------------------------------
// Must be declared before any import that transitively resolves this module.
// Vitest hoists vi.mock() calls to the top of the compiled output, so the
// factory runs before any import statement in this file.

const protectSpy = vi.fn().mockResolvedValue(undefined);

vi.mock('@clerk/nextjs/server', () => {
  // The factory is called fresh each time the module is required; rebuild the
  // spy reference so afterEach can reset it without losing the reference.
  return {
    clerkMiddleware:
      (handler: (auth: unknown, req: unknown, evt: unknown) => unknown) =>
      async (req: unknown, evt: unknown) => {
        const mockAuth = Object.assign(vi.fn().mockResolvedValue({ userId: null }), {
          protect: protectSpy,
        });
        return handler(mockAuth, req, evt);
      },
  };
});

import { NextRequest } from 'next/server';
// ---------- subject under test -----------------------------------------
import middleware from './middleware';

// ---------- helpers ----------------------------------------------------
const makeReq = (path = '/') => new NextRequest(`http://localhost:3001${path}`);

// ---------- tests -------------------------------------------------------
describe('admin middleware', () => {
  const originalKey = process.env.CLERK_SECRET_KEY;

  afterEach(() => {
    protectSpy.mockReset();
    // Restore the original env value (which is likely undefined in local dev).
    if (originalKey === undefined) delete process.env.CLERK_SECRET_KEY;
    else process.env.CLERK_SECRET_KEY = originalKey;
  });

  describe('when CLERK_SECRET_KEY is absent (credential-free boot)', () => {
    it('passes every request through without enforcing auth', async () => {
      delete process.env.CLERK_SECRET_KEY;

      const response = await middleware(makeReq('/settings'), {} as never);

      // NextResponse.next() resolves to a 200 pass-through response.
      expect(response?.status).toBe(200);
    });

    it('never calls auth.protect()', async () => {
      delete process.env.CLERK_SECRET_KEY;

      await middleware(makeReq('/'), {} as never);

      expect(protectSpy).not.toHaveBeenCalled();
    });
  });

  describe('when CLERK_SECRET_KEY is present', () => {
    it('calls auth.protect() to enforce auth at the edge', async () => {
      process.env.CLERK_SECRET_KEY = 'sk_test_placeholder';

      await middleware(makeReq('/'), {} as never);

      expect(protectSpy).toHaveBeenCalledOnce();
    });
  });
});
