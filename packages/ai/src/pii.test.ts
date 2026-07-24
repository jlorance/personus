import { describe, expect, it } from 'vitest';
import { redactPII, redactPIIDeep } from './pii';

describe('redactPII', () => {
  it('detects and redacts emails, phones, and ssns', () => {
    const r = redactPII('reach me at jane@x.com or 415-555-1234');
    expect(r.hasPII).toBe(true);
    expect(r.detectedTypes).toEqual(expect.arrayContaining(['email', 'phone']));
    expect(r.redactedText).not.toContain('jane@x.com');
    expect(r.redactedText).not.toContain('415-555-1234');
  });
  it('leaves clean text untouched', () => {
    const r = redactPII('Restores Victorian plumbing');
    expect(r.hasPII).toBe(false);
    expect(r.redactedText).toBe('Restores Victorian plumbing');
  });
});

describe('redactPIIDeep', () => {
  it('redacts strings nested in objects and arrays', () => {
    const out = redactPIIDeep({
      headline: 'email me at a@b.com',
      skills: [{ name: 'call 415-555-1234' }, { name: 'Plumbing' }],
    }) as { headline: string; skills: Array<{ name: string }> };
    expect(out.headline).not.toContain('a@b.com');
    expect(out.skills[0].name).not.toContain('415-555-1234');
    expect(out.skills[1].name).toBe('Plumbing');
  });
});
