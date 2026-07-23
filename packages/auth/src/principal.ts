/**
 * Principal — the canonical identity token threaded to every service call and
 * agent tool. Construction goes through the AuthN provider seam (never a vendor
 * SDK directly), then builds the CASL ability from @personus/authz.
 */

import {
  type AppAbility,
  buildAbilityContext,
  buildNarrowAbility,
  defineAbilitiesFor,
  parseRole,
  type Role,
} from '@personus/authz';
import { db } from '@personus/db';
import { eq } from '@personus/db/orm';
import { users, userTraits } from '@personus/db/schema';
import { UnauthorizedError } from '@personus/db/services';
import { serverAuth } from './index';
import type { AuthUser } from './provider';

export type ActorType = 'user' | 'system' | 'agent' | 'webhook' | 'mcp-anonymous';

export interface Principal {
  actorId: string;
  actorType: ActorType;
  /** Internal DB user id (stringified bigint); null for system/webhook/anon. */
  userId: string | null;
  /** External IdP subject id (vendor-neutral); null for non-user actors. */
  authSubjectId: string | null;
  email: string | null;
  role: Role;
  ability: AppAbility;
  networkDepth: 1 | 2;
  delegatedAuthority?: {
    agentId: string;
    sessionId: string;
    grantedAt: Date;
    constraints?: Record<string, unknown>;
  };
  mcpClient?: { clientId: string; tier: 'anonymous' | 'authenticated'; tokenIssuedAt: Date };
}

export { ForbiddenError, NotFoundError, UnauthorizedError } from '@personus/db/services';

/** Provision (or fetch) the internal DB user for an authenticated subject. */
async function resolveDbUser(authUser: AuthUser): Promise<typeof users.$inferSelect> {
  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.authSubjectId, authUser.subjectId))
    .limit(1);
  if (existing) return existing;

  const provisionedBy = `auth:${authUser.subjectId}`;
  const [created] = await db
    .insert(users)
    .values({
      authSubjectId: authUser.subjectId,
      email: authUser.email,
      createdBy: provisionedBy,
      updatedBy: provisionedBy,
    })
    .returning();
  await db.insert(userTraits).values({
    userId: created.id,
    traits: {},
    createdBy: provisionedBy,
    updatedBy: provisionedBy,
  });
  return created;
}

/** Resolve the current session into a Principal, or null if unauthenticated. */
export async function getOptionalPrincipal(): Promise<Principal | null> {
  if (!serverAuth.isConfigured()) return null;
  const authUser = await serverAuth.currentUser();
  if (!authUser) return null;

  const dbUser = await resolveDbUser(authUser);
  const role = parseRole(authUser.roleClaim);
  const userIdStr = String(dbUser.id);
  const ability = defineAbilitiesFor(await buildAbilityContext(userIdStr, role));

  return {
    actorId: `user:${userIdStr}`,
    actorType: 'user',
    userId: userIdStr,
    authSubjectId: authUser.subjectId,
    email: dbUser.email,
    role,
    ability,
    networkDepth: 2,
  };
}

/** Resolve the current session into a Principal; throws if unauthenticated. */
export async function getPrincipal(): Promise<Principal> {
  const p = await getOptionalPrincipal();
  if (!p) throw new UnauthorizedError();
  return p;
}

export interface SystemActorDef {
  actorId: string;
  actorType: ActorType;
  ability: AppAbility;
  _productionGuard?: true;
}

/** Construct a Principal for a named system actor (no session). */
export function getSystemPrincipal(actor: SystemActorDef): Principal {
  if (actor._productionGuard && process.env.NODE_ENV === 'production') {
    throw new Error(`System actor "${actor.actorId}" is not constructible in production.`);
  }
  return {
    actorId: actor.actorId,
    actorType: actor.actorType,
    userId: null,
    authSubjectId: null,
    email: null,
    role: 'user',
    ability: actor.ability,
    networkDepth: 1,
  };
}

/** Narrow a user Principal for an AI agent acting on their behalf. */
export function asAgent(
  base: Principal,
  agent: { agentId: string; sessionId: string; constraints?: Record<string, unknown> },
): Principal {
  if (base.actorType !== 'user') throw new Error('asAgent() requires a user Principal as base');
  return {
    ...base,
    actorId: `agent:${agent.agentId}`,
    actorType: 'agent',
    networkDepth: 2,
    delegatedAuthority: {
      agentId: agent.agentId,
      sessionId: agent.sessionId,
      grantedAt: new Date(),
      constraints: agent.constraints,
    },
  };
}

/** Narrow anonymous Principal for unauthenticated MCP callers (public read only). */
export function getAnonymousMcpPrincipal(req: Request): Principal {
  const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const ua = req.headers.get('user-agent') ?? 'unknown';
  const clientHash = btoa(`${clientIp}:${ua.slice(0, 32)}`)
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 16);
  return {
    actorId: `mcp-anonymous:${clientHash}`,
    actorType: 'mcp-anonymous',
    userId: null,
    authSubjectId: null,
    email: null,
    role: 'user',
    ability: buildNarrowAbility([['read', 'Persona']]),
    networkDepth: 1,
    mcpClient: { clientId: clientHash, tier: 'anonymous', tokenIssuedAt: new Date() },
  };
}

/**
 * Dev/local Principal for the credential-free boot path (no AuthN configured).
 * Grants a plain-user ability with no DB user attached — enough for the CopilotKit
 * route to stream the Persona Coach conversationally. Data-mutating tool calls
 * that need real ownership will fail closed. NEVER returned in production.
 */
export function getDevPrincipal(): Principal | null {
  if (process.env.NODE_ENV === 'production') return null;
  return {
    actorId: 'agent:persona-coach',
    actorType: 'agent',
    userId: null,
    authSubjectId: null,
    email: null,
    role: 'user',
    ability: buildNarrowAbility([
      ['read', 'Persona'],
      ['read', 'TraitTaxonomy'],
    ]),
    networkDepth: 1,
    delegatedAuthority: { agentId: 'persona-coach', sessionId: 'dev', grantedAt: new Date() },
  };
}

export type { AppAbility, Role };
