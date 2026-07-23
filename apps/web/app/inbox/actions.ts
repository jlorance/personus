'use server';

import { getContactRelay } from '@personus/contact';
import { db } from '@personus/db';
import { eq } from '@personus/db/orm';
import { personas } from '@personus/db/schema';
import { relayModeFor, respondToContact } from '@personus/db/services';
import { logger } from '@personus/logger';
import { getTransport } from '@personus/notifications';
import { revalidatePath } from 'next/cache';
import { requirePrincipal } from '@/lib/require-principal';

/**
 * Respond to a contact request, then fan out delivery through the de-conflated
 * channel abstractions: ContactRelay (privacy-mediated introduction to the
 * requester) and NotificationTransport (in-app notice to the recipient).
 */
export async function respondAction(formData: FormData): Promise<void> {
  const principal = await requirePrincipal();
  const requestId = String(formData.get('requestId') ?? '');
  const decision = String(formData.get('decision') ?? '') as 'approved' | 'declined';
  if (!requestId || (decision !== 'approved' && decision !== 'declined')) return;

  const result = await respondToContact(principal, requestId, decision);

  if (decision === 'approved') {
    try {
      // Resolve the recipient's preferred relay mode from their persona prefs.
      const [target] = await db
        .select({ prefs: personas.contactPreferences })
        .from(personas)
        .where(eq(personas.uri, result.toPersonaUri))
        .limit(1);
      const relay = getContactRelay(relayModeFor(target?.prefs));
      await relay.deliver({
        contactRequestId: result.request.publicId,
        toPersonaUri: result.toPersonaUri,
        fromLabel: result.fromLabel,
        reason: result.request.reason,
        message: result.request.message ?? '',
      });
      await getTransport('in_app').send({
        userId: principal.userId ?? 'unknown',
        type: 'contact.approved',
        title: 'Introduction approved',
        body: `You approved a request to ${result.toPersonaUri}.`,
      });
    } catch (err) {
      logger.warn({ err: String(err) }, 'contact delivery failed (non-fatal)');
    }
  }

  revalidatePath('/inbox');
}
