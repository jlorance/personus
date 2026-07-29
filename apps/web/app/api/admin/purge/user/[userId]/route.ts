/**
 * GDPR data-subject erasure endpoint (PER-31).
 *
 * POST /api/admin/purge/user/:userId
 *
 * Hard-deletes all PII for the given internal userId:
 *   - All personas (embedding evicted from vector index before deletion)
 *   - All coach sessions (verbatim transcript data)
 *   - All Mastra agent memory threads (conversational history)
 *
 * Access control: principal must be a platform admin
 * (`manage AdminSurface` via CASL, checked by `getAdminPrincipal()`).
 * The leaf services re-check `purge Persona` / `purge CoachSession`
 * individually as defence-in-depth.
 *
 * Returns JSON: { ok: true, personasDeleted, coachSessionsDeleted, memoryThreadsDeleted }
 */

import { purgeAgentMemory } from '@personus/ai';
import { getOptionalPrincipal } from '@personus/auth/principal';
import { purgeUser } from '@personus/db/services';
import { logger } from '@personus/logger';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  // Resolve principal and enforce admin gate — return 401/403 (not a redirect)
  // so programmatic callers get a machine-readable status code.
  const principal = await getOptionalPrincipal();
  if (!principal) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 });
  }
  if (!principal.ability.can('manage', 'AdminSurface')) {
    return NextResponse.json({ ok: false, reason: 'forbidden' }, { status: 403 });
  }

  const { userId } = await params;

  // Basic type guard — userId must be a numeric string (internal bigint id).
  if (!/^\d+$/.test(userId)) {
    return NextResponse.json({ ok: false, reason: 'invalid userId' }, { status: 400 });
  }

  try {
    const [dbResult, memoryThreadsDeleted] = await Promise.all([
      purgeUser(principal, userId),
      purgeAgentMemory(userId),
    ]);

    logger.info(
      {
        actorId: principal.actorId,
        userId,
        personasDeleted: dbResult.personasDeleted,
        coachSessionsDeleted: dbResult.coachSessionsDeleted,
        memoryThreadsDeleted,
      },
      'admin: GDPR user purge completed',
    );

    return NextResponse.json({
      ok: true,
      userId,
      personasDeleted: dbResult.personasDeleted,
      coachSessionsDeleted: dbResult.coachSessionsDeleted,
      memoryThreadsDeleted,
    });
  } catch (err) {
    logger.error({ err: String(err), userId, actorId: principal.actorId }, 'user purge failed');
    return NextResponse.json({ ok: false, reason: 'internal error' }, { status: 500 });
  }
}
