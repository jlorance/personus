/**
 * Agent RequestContext threading (PER-23).
 *
 * `buildAgentRequestContext` existed with zero call sites, so every agent tool
 * invoked through CopilotKit ran without a principal: a hard throw in
 * production, a read-only dev fallback everywhere else. These assert the
 * round-trip the CopilotKit route depends on, and the per-agent attribution
 * that makes the audit trail mean anything.
 */

import type { Principal } from '@personus/auth/principal';
import { describe, expect, it } from 'vitest';
import {
  AGENT_IDS,
  agentRequestContexts,
  buildAgentRequestContext,
  getToolPrincipal,
} from './principal-context';

function userPrincipal(): Principal {
  return {
    userId: '42',
    actorId: 'user:42',
    actorType: 'user',
    networkDepth: 2,
    ability: { can: () => true } as unknown as Principal['ability'],
  } as Principal;
}

describe('buildAgentRequestContext', () => {
  it('round-trips a principal that getToolPrincipal can read back', () => {
    const ctx = buildAgentRequestContext(userPrincipal(), {
      agentId: 'persona-coach',
      sessionId: 's1',
    });

    const read = getToolPrincipal({ requestContext: ctx });

    expect(read.actorType).toBe('agent');
    expect(read.actorId).toBe('agent:persona-coach');
    expect(read.userId).toBe('42');
  });

  it('records the delegation so the audit trail names the agent that acted', () => {
    const ctx = buildAgentRequestContext(userPrincipal(), {
      agentId: 'discovery',
      sessionId: 'sess-abc',
    });

    const read = getToolPrincipal({ requestContext: ctx });

    expect(read.delegatedAuthority?.agentId).toBe('discovery');
    expect(read.delegatedAuthority?.sessionId).toBe('sess-abc');
  });
});

describe('agentRequestContexts', () => {
  it('builds one context per registered agent', () => {
    const contexts = agentRequestContexts(userPrincipal(), 's1');

    expect(Object.keys(contexts).sort()).toEqual([...AGENT_IDS].sort());
  });

  it('attributes each context to its own agent, not to a shared one', () => {
    const contexts = agentRequestContexts(userPrincipal(), 's1');

    // The bug this guards: one context shared across all three agents would
    // stamp every tool call with whichever agentId happened to be chosen, and
    // the audit log would attribute Discovery's actions to the Coach.
    const actorIds = AGENT_IDS.map(
      (id) => getToolPrincipal({ requestContext: contexts[id] }).actorId,
    );

    expect(new Set(actorIds).size).toBe(AGENT_IDS.length);
    expect(actorIds).toContain('agent:persona-coach');
    expect(actorIds).toContain('agent:discovery');
    expect(actorIds).toContain('agent:recommender');
  });

  it('yields no contexts for an anonymous caller', () => {
    const contexts = agentRequestContexts(null, 's1');

    for (const id of AGENT_IDS) {
      expect(contexts[id]).toBeUndefined();
    }
  });
});

describe('getToolPrincipal without a context', () => {
  it('fails loudly in production rather than returning a generic tool error', () => {
    const prev = process.env.NODE_ENV;
    // biome-ignore lint/complexity/useLiteralKeys: NODE_ENV is readonly in the type
    (process.env as Record<string, string>)['NODE_ENV'] = 'production';
    try {
      // The silent-failure path is what let PER-23 ship: the model saw a generic
      // "tool execution failed" and had no way to report the real cause.
      expect(() => getToolPrincipal({})).toThrow(/without a principal in requestContext/);
    } finally {
      (process.env as Record<string, string>)['NODE_ENV'] = prev ?? 'test';
    }
  });
});
