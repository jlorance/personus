import { getOptionalPrincipal, type Principal } from '@personus/auth/principal';
import { redirect } from 'next/navigation';

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
