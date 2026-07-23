/**
 * AuthN webhook — receives user lifecycle events from the configured provider.
 *
 * Users are provisioned lazily on first authenticated request (see
 * getOptionalPrincipal), so this endpoint's job is the events that DON'T come
 * through a session: primarily `user.deleted` (GDPR soft-delete). It verifies
 * the payload through the provider seam before acting; unverified or
 * unconfigured requests are rejected without side effects.
 */

import { auth } from '@personus/auth';
import { db } from '@personus/db';
import { eq } from '@personus/db/orm';
import { users } from '@personus/db/schema';
import { logger } from '@personus/logger';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const raw = await req.text();
  const headers = Object.fromEntries(req.headers.entries());

  const event = auth.verifyWebhook(raw, headers);
  if (!event) {
    // Unverified or provider not configured for webhooks — do nothing.
    return NextResponse.json({ ok: false, reason: 'unverified' }, { status: 401 });
  }

  try {
    if (event.type === 'user.deleted') {
      const subjectId = String((event.data as { id?: string }).id ?? '');
      if (subjectId) {
        await db
          .update(users)
          .set({ deletedAt: new Date(), updatedBy: 'webhook:auth' })
          .where(eq(users.authSubjectId, subjectId));
        logger.info({ subjectId }, 'auth webhook: soft-deleted user');
      }
    }
  } catch (err) {
    logger.error({ err: String(err), type: event.type }, 'auth webhook handling failed');
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
