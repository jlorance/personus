import { getOptionalPrincipal, type Principal } from '@personus/auth/principal';
import { logger } from '@personus/logger';
import { redirect } from 'next/navigation';

/** Resolve the current principal if they may manage the admin surface, else null. */
export async function getAdminPrincipal(): Promise<Principal | null> {
  try {
    const p = await getOptionalPrincipal();
    if (p?.ability.can('manage', 'AdminSurface')) return p;
  } catch (err) {
    // Fail closed, but don't mask an infra outage silently.
    logger.warn({ err: String(err) }, 'admin gate: auth/DB unavailable');
  }
  return null;
}

/** For server actions — require admin or redirect home (which shows the gate). */
export async function requireAdmin(): Promise<Principal> {
  const p = await getAdminPrincipal();
  if (!p) redirect('/');
  return p;
}
