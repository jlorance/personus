/**
 * AuthN factory — selects the concrete provider via `AUTH_PROVIDER`.
 *
 *   clerk  (default, working)
 *   workos (stub — throws on use, see workos.ts)
 *
 * `auth` is the provider instance (user/org lookups, webhooks); `serverAuth` is
 * the request-context reader (current session). Both are module singletons.
 */

import { logger } from '@personus/logger';
import { ClerkProvider, clerkServerAuth } from './clerk';
import type { AuthProvider, ServerAuth } from './provider';
import { WorkOSProvider, workosServerAuth } from './workos';

function select(): { provider: AuthProvider; serverAuth: ServerAuth } {
  const name = (process.env.AUTH_PROVIDER ?? 'clerk').toLowerCase();
  switch (name) {
    case 'clerk':
      return { provider: new ClerkProvider(), serverAuth: clerkServerAuth };
    case 'workos':
      return { provider: new WorkOSProvider(), serverAuth: workosServerAuth };
    default:
      logger.warn({ provider: name }, 'Unknown AUTH_PROVIDER — falling back to clerk');
      return { provider: new ClerkProvider(), serverAuth: clerkServerAuth };
  }
}

const selected = select();

export const auth: AuthProvider = selected.provider;
export const serverAuth: ServerAuth = selected.serverAuth;

export type { AuthProvider, AuthUser, Organization, ServerAuth, WebhookEvent } from './provider';
