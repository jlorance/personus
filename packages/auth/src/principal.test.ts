import { buildNarrowAbility } from '@personus/authz';
import { describe, expect, it } from 'vitest';
import { asAgent, type Principal } from './principal';

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
