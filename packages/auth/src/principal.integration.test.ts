/**
 * Integration tests for resolveMcpPrincipal — authenticated tier.
 *
 * These tests run only when TEST_DATABASE_URL is set (see harness.ts). They
 * mock the external Clerk calls (verifyBearerToken, getUserBySubjectId) but let
 * resolveDbUser and buildAbilityContext run against a real Postgres instance so
 * the full principal-construction path is exercised.
 *
 * REQUIRE_TEST_DB=1 makes a missing database a hard failure (not a silent skip).
 */

import { hasTestDb, resetTables, setupTestDb, teardownTestDb } from '@personus/db/test';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthUser } from './provider';

// ─── Mock Clerk calls — only the external network boundary ────────────────────

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

vi.mock('./index', () => ({
  serverAuth: mockServerAuth,
  auth: mockAuth,
}));

import { resolveMcpPrincipal } from './principal';

// ─── Suite ────────────────────────────────────────────────────────────────────

describe.skipIf(!hasTestDb)('resolveMcpPrincipal — authenticated tier (integration)', () => {
  beforeAll(async () => {
    await setupTestDb();
  });

  beforeEach(async () => {
    await resetTables();
    vi.clearAllMocks();
    mockServerAuth.isConfigured.mockReturnValue(true);
  });

  afterAll(async () => {
    await teardownTestDb();
  });

  it('returns networkDepth 2 and tier=authenticated for a verified token', async () => {
    const subjectId = 'user_integration_test_01';
    mockServerAuth.verifyBearerToken.mockResolvedValue(subjectId);
    mockAuth.getUserBySubjectId.mockResolvedValue({
      subjectId,
      email: 'mcp-auth@example.com',
      roleClaim: 'user',
    });

    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer real-looking-token' },
    });
    const principal = await resolveMcpPrincipal(req);

    expect(principal.networkDepth).toBe(2);
    expect(principal.mcpClient?.tier).toBe('authenticated');
    expect(principal.actorType).toBe('user');
    expect(principal.userId).not.toBeNull();
    expect(principal.email).toBe('mcp-auth@example.com');
    expect(principal.authSubjectId).toBe(subjectId);
    // Must be able to read personas (minimum ability for an authenticated user).
    expect(principal.ability.can('read', 'Persona')).toBe(true);
    // Must be able to create contact requests (the introduction gate).
    expect(principal.ability.can('create', 'ContactRequest')).toBe(true);
  });

  it('provisions a new DB user on first authenticated call', async () => {
    const subjectId = 'user_first_mcp_call';
    mockServerAuth.verifyBearerToken.mockResolvedValue(subjectId);
    mockAuth.getUserBySubjectId.mockResolvedValue({
      subjectId,
      email: 'first-timer@example.com',
      roleClaim: undefined,
    });

    const req = new Request('http://localhost/api/mcp', {
      method: 'POST',
      headers: { Authorization: 'Bearer first-time-token' },
    });
    const principal = await resolveMcpPrincipal(req);

    // User must have been provisioned and given a real DB id.
    expect(principal.userId).toMatch(/^\d+$/);
    expect(principal.networkDepth).toBe(2);

    // Second call for the same subject should return the same userId (idempotent).
    const principal2 = await resolveMcpPrincipal(req);
    expect(principal2.userId).toBe(principal.userId);
  });
});
