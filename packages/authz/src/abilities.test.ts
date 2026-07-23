import { describe, expect, it } from 'vitest';
import { defineAbilitiesFor, defineAbilitiesForRole, parseRole } from './abilities';

describe('CASL abilities', () => {
  it('defaults role to user and never infers admin', () => {
    expect(parseRole(undefined)).toBe('user');
    expect(parseRole('root')).toBe('user');
    expect(parseRole('admin')).toBe('admin');
  });

  it('grants a plain user persona CRUD but not admin surface or purge', () => {
    const a = defineAbilitiesForRole('user');
    expect(a.can('create', 'Persona')).toBe(true);
    expect(a.can('read', 'Persona')).toBe(true);
    expect(a.can('manage', 'AdminSurface')).toBe(false);
    expect(a.can('purge', 'User')).toBe(false);
  });

  it('treats endorsements as immutable', () => {
    const a = defineAbilitiesForRole('user');
    expect(a.can('create', 'Endorsement')).toBe(true);
    expect(a.can('update', 'Endorsement')).toBe(false);
  });

  it('grants admin the admin surface and purge', () => {
    const a = defineAbilitiesForRole('admin');
    expect(a.can('manage', 'AdminSurface')).toBe(true);
    expect(a.can('purge', 'Persona')).toBe(true);
    expect(a.can('manage', 'CommunityType')).toBe(true);
  });

  it('grants community admins management of their community only', () => {
    const a = defineAbilitiesFor({
      userId: '1',
      personaUris: ['per_x'],
      communityIds: ['10'],
      communityRoles: { '10': 'admin' },
      role: 'user',
    });
    expect(a.can('manage', 'Membership')).toBe(true);
    expect(a.can('manage', 'PlatformChannel')).toBe(true);
    expect(a.can('update', 'Community')).toBe(true);
  });
});
