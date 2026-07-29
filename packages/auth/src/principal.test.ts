import { buildNarrowAbility } from '@personus/authz';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from './provider';

// ─── Module-level mocks ────────────────────────────────────────────────────────
// vi.hoisted runs before module imports, so these vi.fn() instances can be used
// safely inside vi.mock() factories AND referenced in test bodies.

const mockServerAuth = vi.hoisted(() => ({
  isConfigured: vi.fn().mockReturnValue(true),
  verifyBearerToken: vi.fn<(token: string) => Promise<string | null>>().mockResolvedValue(null),
  subjectId: vi.fn().mockResolvedValue(null),
  currentUser: vi.fn().mockResolvedValue(null),
}));

const mockAuth = vi.hoisted(() => ({
  name: 'mock',
  getUserBySubjectId: vi.fn<(id: string) => Promise<AuthUser | null>>().mockResolvedValue(null),
  getUserByEmail: vi.fn().mockResolvedValue(null),
  getUserOrganizations: vi.fn().mockResolvedValue([]),
  verifyWebhook: vi.fn().mockReturnValue(null),
}));

// Replace the auth singletons principal.ts reads at import time.
vi.mock('./index', () => ({
  serverAuth: mockServerAuth,
  auth: mockAuth,
}));

import { asAgent, type Principal, resolveMcpPrincipal } from './principal';

/** A minimal full-authority user principal to delegate from. */
function userBase(): Principal {
  return {
    actorId: 'user:1',
    actorType: 'user',
    userId: '1',
    authSubjectId: 'sub_1',
    email: 'u1@x.com',
    role: 'user',
    ability: buildNarrowAbility([
      ['read', 'Persona'],
      ['update', 'Persona'],
      ['delete', 'Persona'],
    ]),
    networkDepth: 2,
  };
}

// ─── resolveMcpPrincipal — both tiers ─────────────────────────────────────────

describe('resolveMcpPrincipal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockServerAuth.isConfigured.mockReturnValue(true);
    mockServerAuth.verifyBearerToken.mockResolvedValue(null);
    mockAuth.getUserBySubjectId.mockResolvedValue(null);
  });

  it('returns anonymous principal when Authorization header is absent', async () => {
    const req = new Request('http://localhost/api/mcp', { method: 'POST' });
    const principal = await resolveMcpPrincipal(req);
    expect(principal.networkDepth).toBe(1);
    expect(principal.mcpClient?.tier).toBe('anonymous');
    expect(principal.userId).toBeNull();
    expect(mockServerAuth.verifyBearerToken).not.toHaveBeenCalled();
  });

  it('returns anonymous principal when Authorization header is malformed', async () => {
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Basic dXNlcjpwYXNz' },
    });
    const principal = await resolveMcpPrincipal(req);
    expect(principal.networkDepth).toBe(1);
    expect(principal.mcpClient?.tier).toBe('anonymous');
    expect(mockServerAuth.verifyBearerToken).not.toHaveBeenCalled();
  });

  it('returns anonymous principal when Bearer token fails verification', async () => {
    mockServerAuth.verifyBearerToken.mockResolvedValue(null);
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer bad-token' },
    });
    const principal = await resolveMcpPrincipal(req);
    expect(principal.networkDepth).toBe(1);
    expect(principal.mcpClient?.tier).toBe('anonymous');
    expect(mockServerAuth.verifyBearerToken).toHaveBeenCalledWith('bad-token');
  });

  it('returns anonymous principal when token is valid but user is unknown in the auth provider', async () => {
    mockServerAuth.verifyBearerToken.mockResolvedValue('sub_orphaned');
    mockAuth.getUserBySubjectId.mockResolvedValue(null);
    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer orphaned-token' },
    });
    const principal = await resolveMcpPrincipal(req);
    expect(principal.networkDepth).toBe(1);
    expect(principal.mcpClient?.tier).toBe('anonymous');
    expect(mockAuth.getUserBySubjectId).toHaveBeenCalledWith('sub_orphaned');
  });
});

// ─── asAgent delegation ────────────────────────────────────────────────────────

describe('asAgent delegation', () => {
  it('inherits the full user ability when no allow-list is given', () => {
    const agent = asAgent(userBase(), { agentId: 'coach', sessionId: 's1' });
    expect(agent.actorType).toBe('agent');
    expect(agent.ability.can('update', 'Persona')).toBe(true);
    expect(agent.ability.can('delete', 'Persona')).toBe(true);
  });

  it('NARROWS authority to exactly the allow-list when given', () => {
    const agent = asAgent(userBase(), {
      agentId: 'coach',
      sessionId: 's1',
      allow: [['read', 'Persona']],
    });
    // Can do the one granted thing…
    expect(agent.ability.can('read', 'Persona')).toBe(true);
    // …and CANNOT do what the base user could — the delegation actually reduces power.
    expect(agent.ability.can('update', 'Persona')).toBe(false);
    expect(agent.ability.can('delete', 'Persona')).toBe(false);
  });

  it('rejects delegating from a non-user principal', () => {
    const sys = { ...userBase(), actorType: 'system' as const };
    expect(() => asAgent(sys, { agentId: 'x', sessionId: 's' })).toThrow(/requires a user/);
  });
});
