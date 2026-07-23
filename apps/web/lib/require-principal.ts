import { getOptionalPrincipal, type Principal } from '@personus/auth/principal';
import { logger } from '@personus/logger';
import { redirect } from 'next/navigation';

/**
 * Resolve the current principal for a PAGE (never redirects) — returns null when
 * unauthenticated or when auth/DB is unavailable, so pages can render a sign-in
 * or offline state. Centralizes the try/catch every gated page used to repeat.
 */
export async function getPagePrincipal(): Promise<Principal | null> {
  try {
    return await getOptionalPrincipal();
  } catch (err) {
    logger.warn({ err: String(err) }, 'getPagePrincipal: auth/DB unavailable');
    return null;
  }
}

/**
 * Resolve the caller's Principal in a server action, redirecting to sign-in when
 * unauthenticated. Prevents a direct action POST from surfacing an uncaught
 * UnauthorizedError as a 500.
 */
export async function requirePrincipal(): Promise<Principal> {
  let principal: Principal | null = null;
  try {
    principal = await getOptionalPrincipal();
  } catch {
    principal = null;
  }
  if (!principal) redirect('/sign-in');
  return principal;
}
