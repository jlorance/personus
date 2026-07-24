/**
 * Contact-request inbox — list requests addressed to the principal's personas
 * and respond (approve/decline). Delivery (ContactRelay / NotificationTransport)
 * is triggered by the caller after a successful response, keeping this layer
 * free of delivery concerns.
 */

import type { ContactRelayMode } from '@personus/constants';
import { db } from '../index';
import { and, eq, inArray, isNull } from '../orm';
import { contactRequests, personas } from '../schema';
import { canRespondToContact, relayModeFor, type Viewer } from './gates';
import { ForbiddenError, NotFoundError, type ServicePrincipal } from './index';

export interface InboxItem {
  publicId: string;
  toPersonaUri: string;
  fromPersonaUri: string | null;
  reason: string;
  message: string | null;
  status: string;
  createdAt: Date;
}

/** List contact requests addressed to any of the principal's personas. */
export async function listInbox(principal: ServicePrincipal): Promise<InboxItem[]> {
  if (!principal.userId || !principal.ability.can('read', 'ContactRequest')) return [];

  const myPersonas = await db
    .select({ uri: personas.uri })
    .from(personas)
    .where(and(eq(personas.userId, BigInt(principal.userId)), isNull(personas.deletedAt)));
  const uris = myPersonas.map((p) => p.uri);
  if (uris.length === 0) return [];

  const rows = await db
    .select({
      publicId: contactRequests.publicId,
      toPersonaUri: contactRequests.toPersonaUri,
      fromPersonaUri: contactRequests.fromPersonaUri,
      reason: contactRequests.reason,
      message: contactRequests.message,
      status: contactRequests.status,
      createdAt: contactRequests.createdAt,
    })
    .from(contactRequests)
    .where(and(inArray(contactRequests.toPersonaUri, uris), isNull(contactRequests.deletedAt)))
    .orderBy(contactRequests.createdAt);
  return rows;
}

export interface RespondResult {
  request: typeof contactRequests.$inferSelect;
  /** Owner-facing summary the caller can pass to ContactRelay/NotificationTransport. */
  toPersonaUri: string;
  fromLabel: string;
  /**
   * Delivery mode resolved from the recipient's persona prefs — returned here so
   * the caller never has to read the persona directly (keeps contact delivery on
   * the gated service path). The recipient is the responding principal.
   */
  relayMode: ContactRelayMode;
}

/**
 * Respond to a pending contact request. Only the recipient (owner of the target
 * persona) may respond, and only while it is still pending.
 */
export async function respondToContact(
  principal: ServicePrincipal,
  requestPublicId: string,
  decision: 'approved' | 'declined',
  note?: string,
): Promise<RespondResult> {
  if (!principal.userId || !principal.ability.can('update', 'ContactRequest')) {
    throw new ForbiddenError();
  }

  const [req] = await db
    .select()
    .from(contactRequests)
    .where(and(eq(contactRequests.publicId, requestPublicId), isNull(contactRequests.deletedAt)))
    .limit(1);
  if (!req) throw new NotFoundError('Contact request not found');

  const [target] = await db
    .select({ userId: personas.userId, contactPreferences: personas.contactPreferences })
    .from(personas)
    .where(and(eq(personas.uri, req.toPersonaUri), isNull(personas.deletedAt)))
    .limit(1);
  const toOwnerUserId = target ? String(target.userId) : null;

  const viewer: Viewer = { userId: principal.userId, networkDepth: 2 };
  if (!canRespondToContact(viewer, { toOwnerUserId, status: req.status })) {
    // Non-owner probing a request id gets a 404-shape, not a 403 (don't leak existence).
    throw new NotFoundError('Contact request not found');
  }

  const [updated] = await db
    .update(contactRequests)
    .set({
      status: decision,
      responseNote: note ?? null,
      respondedAt: new Date(),
      updatedBy: `user:${principal.userId}`,
      updatedAt: new Date(),
    })
    .where(eq(contactRequests.id, req.id))
    .returning();
  if (!updated) throw new NotFoundError('Contact request already resolved');

  return {
    request: updated,
    toPersonaUri: req.toPersonaUri,
    fromLabel: req.fromPersonaUri ?? 'an anonymous visitor',
    relayMode: relayModeFor(target?.contactPreferences),
  };
}
