/**
 * Pure authorization + mapping helpers — the decision core of the service layer.
 *
 * Everything here is a pure function of its inputs (no DB, no I/O), so it can be
 * unit-tested exhaustively. Services do the DB reads, then delegate the actual
 * "may they?" / "what shape?" decision to these helpers.
 */

import type { ContactRelayMode } from '@personus/constants';

export interface Viewer {
  userId: string | null;
  networkDepth: 1 | 2;
}

export type Visibility = 'public' | 'authenticated' | 'community' | 'private';

/**
 * Can `viewer` see a persona with the given visibility/owner?
 * - public: everyone
 * - authenticated/community: networkDepth ≥ 2 (a signed-in caller)
 * - private: owner only
 * The owner can always see their own persona regardless of visibility.
 */
export function canViewPersona(
  viewer: Viewer,
  persona: { visibility: string; ownerUserId: string | null },
): boolean {
  if (persona.ownerUserId != null && persona.ownerUserId === viewer.userId) return true;
  switch (persona.visibility) {
    case 'public':
      return true;
    case 'authenticated':
    case 'community':
      return viewer.networkDepth >= 2;
    default:
      return false;
  }
}

/** SQL-fragment intent for a persona list query: which visibilities are allowed. */
export function allowedVisibilities(networkDepth: 1 | 2): Visibility[] {
  return networkDepth >= 2 ? ['public', 'authenticated', 'community'] : ['public'];
}

/**
 * Can `viewer` see an endorsement? Owner (endorser or target) always can;
 * otherwise it follows the endorsement's own visibility, with 'community'
 * requiring membership (supplied by the caller after a lookup).
 */
export function canViewEndorsement(
  viewer: Viewer,
  endorsement: {
    visibility: string;
    fromOwnerUserId: string | null;
    toOwnerUserId: string | null;
  },
  isCommunityMember: boolean,
): boolean {
  if (viewer.userId != null) {
    if (endorsement.fromOwnerUserId === viewer.userId) return true;
    if (endorsement.toOwnerUserId === viewer.userId) return true;
  }
  switch (endorsement.visibility) {
    case 'public':
      return true;
    case 'authenticated':
      return viewer.networkDepth >= 2;
    case 'community':
      return isCommunityMember;
    default:
      return false;
  }
}

/** An endorsement must target exactly one of a real persona or a shadow persona. */
export function endorsementTargetValid(input: {
  toPersonaUri?: string | null;
  toShadowPersonaId?: string | null;
}): boolean {
  const hasPersona = !!input.toPersonaUri;
  const hasShadow = !!input.toShadowPersonaId;
  return (hasPersona || hasShadow) && !(hasPersona && hasShadow);
}

/** Only the recipient (owner of the target persona) may respond to a contact request. */
export function canRespondToContact(
  viewer: Viewer,
  request: { toOwnerUserId: string | null; status: string },
): boolean {
  if (viewer.userId == null) return false;
  if (request.toOwnerUserId !== viewer.userId) return false;
  return request.status === 'pending';
}

/** Resolve the delivery mode for a mediated contact from the recipient's prefs. */
export function relayModeFor(contactPreferences: unknown): ContactRelayMode {
  const prefs = (contactPreferences ?? {}) as { preferredRelayMode?: string };
  switch (prefs.preferredRelayMode) {
    case 'email_relay':
      return 'email_relay';
    case 'signal':
      return 'signal';
    default:
      return 'in_app';
  }
}

/** A stable, human-facing summary shape for a persona row. */
export function toPersonaSummary(row: {
  uri: string;
  displayName: string;
  headline: string | null;
  location: string | null;
  completenessScore: number | null;
}): {
  uri: string;
  displayName: string;
  headline: string;
  location: string | null;
  completenessScore: number;
} {
  return {
    uri: row.uri,
    displayName: row.displayName,
    headline: row.headline ?? '',
    location: row.location ?? null,
    completenessScore: row.completenessScore ?? 0,
  };
}

export interface PublicPersona {
  uri: string;
  displayName: string;
  headline: string;
  location: string | null;
  entityType: string;
  traits: unknown;
  completenessScore: number;
}

/**
 * Curated public projection of a persona — the ONLY shape exposed to external AI
 * surfaces (MCP, REST/GPT Actions). Strips internal columns (userId, embedding,
 * deletedAt, contactPreferences, mcp flags). Shared so every surface projects
 * identically.
 */
export function toPublicPersona(row: {
  uri: string;
  displayName: string;
  headline: string | null;
  location: string | null;
  entityType: string;
  traits: unknown;
  completenessScore: number | null;
}): PublicPersona {
  return {
    uri: row.uri,
    displayName: row.displayName,
    headline: row.headline ?? '',
    location: row.location ?? null,
    entityType: row.entityType,
    traits: row.traits,
    completenessScore: row.completenessScore ?? 0,
  };
}

/** Generate a URI slug candidate from a display name (caller ensures uniqueness). */
export function slugifyName(displayName: string): string {
  const base = displayName
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return base || 'persona';
}
