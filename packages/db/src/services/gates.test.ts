import { describe, expect, it } from 'vitest';
import {
  allowedVisibilities,
  canRespondToContact,
  canViewEndorsement,
  canViewPersona,
  endorsementTargetValid,
  relayModeFor,
  slugifyName,
  toPersonaSummary,
  type Viewer,
} from './gates';

const anon: Viewer = { userId: null, networkDepth: 1 };
const user: Viewer = { userId: '7', networkDepth: 2 };

describe('canViewPersona', () => {
  it('owner always sees their own persona, even when private', () => {
    expect(canViewPersona(user, { visibility: 'private', ownerUserId: '7' })).toBe(true);
  });
  it('public is visible to anyone', () => {
    expect(canViewPersona(anon, { visibility: 'public', ownerUserId: '1' })).toBe(true);
  });
  it('authenticated/community need networkDepth ≥ 2', () => {
    expect(canViewPersona(anon, { visibility: 'authenticated', ownerUserId: '1' })).toBe(false);
    expect(canViewPersona(anon, { visibility: 'community', ownerUserId: '1' })).toBe(false);
    expect(canViewPersona(user, { visibility: 'authenticated', ownerUserId: '1' })).toBe(true);
    expect(canViewPersona(user, { visibility: 'community', ownerUserId: '1' })).toBe(true);
  });
  it('private is hidden from non-owners', () => {
    expect(canViewPersona(user, { visibility: 'private', ownerUserId: '1' })).toBe(false);
  });
});

describe('allowedVisibilities', () => {
  it('anon sees public only; authed sees the trio', () => {
    expect(allowedVisibilities(1)).toEqual(['public']);
    expect(allowedVisibilities(2)).toEqual(['public', 'authenticated', 'community']);
  });
});

describe('canViewEndorsement', () => {
  const base = { visibility: 'community', fromOwnerUserId: '1', toOwnerUserId: '2' };
  it('endorser and target can always see it', () => {
    expect(canViewEndorsement({ userId: '1', networkDepth: 2 }, base, false)).toBe(true);
    expect(canViewEndorsement({ userId: '2', networkDepth: 2 }, base, false)).toBe(true);
  });
  it('public visible to all; authenticated needs depth 2', () => {
    expect(canViewEndorsement(anon, { ...base, visibility: 'public' }, false)).toBe(true);
    expect(canViewEndorsement(anon, { ...base, visibility: 'authenticated' }, false)).toBe(false);
    expect(canViewEndorsement(user, { ...base, visibility: 'authenticated' }, false)).toBe(true);
  });
  it('community requires membership', () => {
    const other: Viewer = { userId: '9', networkDepth: 2 };
    expect(canViewEndorsement(other, base, false)).toBe(false);
    expect(canViewEndorsement(other, base, true)).toBe(true);
  });
  it('unknown/private visibility denies', () => {
    expect(canViewEndorsement(user, { ...base, visibility: 'private' }, true)).toBe(false);
  });
});

describe('endorsementTargetValid', () => {
  it('exactly one target is valid', () => {
    expect(endorsementTargetValid({ toPersonaUri: 'per_a' })).toBe(true);
    expect(endorsementTargetValid({ toShadowPersonaId: '5' })).toBe(true);
  });
  it('zero or both targets is invalid', () => {
    expect(endorsementTargetValid({})).toBe(false);
    expect(endorsementTargetValid({ toPersonaUri: 'per_a', toShadowPersonaId: '5' })).toBe(false);
  });
});

describe('canRespondToContact', () => {
  it('only the pending recipient may respond', () => {
    expect(canRespondToContact(user, { toOwnerUserId: '7', status: 'pending' })).toBe(true);
    expect(canRespondToContact(user, { toOwnerUserId: '7', status: 'approved' })).toBe(false);
    expect(canRespondToContact(user, { toOwnerUserId: '8', status: 'pending' })).toBe(false);
    expect(canRespondToContact(anon, { toOwnerUserId: null, status: 'pending' })).toBe(false);
  });
});

describe('relayModeFor', () => {
  it('maps preferences to a relay mode, defaulting to in_app', () => {
    expect(relayModeFor({ preferredRelayMode: 'email_relay' })).toBe('email_relay');
    expect(relayModeFor({ preferredRelayMode: 'signal' })).toBe('signal');
    expect(relayModeFor({ preferredRelayMode: 'nonsense' })).toBe('in_app');
    expect(relayModeFor(null)).toBe('in_app');
    expect(relayModeFor(undefined)).toBe('in_app');
  });
});

describe('toPersonaSummary', () => {
  it('normalizes nullable fields', () => {
    expect(
      toPersonaSummary({
        uri: 'per_a',
        displayName: 'A',
        headline: null,
        location: null,
        completenessScore: null,
      }),
    ).toEqual({
      uri: 'per_a',
      displayName: 'A',
      headline: '',
      location: null,
      completenessScore: 0,
    });
  });
});

describe('slugifyName', () => {
  it('lowercases, strips accents and punctuation, collapses dashes', () => {
    expect(slugifyName('Amélie Lenoir!')).toBe('amelie-lenoir');
    expect(slugifyName('  --Maria   Osei--  ')).toBe('maria-osei');
  });
  it('falls back to "persona" when empty', () => {
    expect(slugifyName('!!!')).toBe('persona');
    expect(slugifyName('')).toBe('persona');
  });
});
