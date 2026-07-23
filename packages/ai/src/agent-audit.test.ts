import { describe, expect, it } from 'vitest';
import { sanitize } from './agent-audit';

describe('sanitize (audit redaction)', () => {
  it('reduces string leaves to presence booleans', () => {
    expect(sanitize('hello')).toEqual({ present: true });
    expect(sanitize('')).toEqual({ present: false });
  });

  it('recurses into nested objects and arrays so PII never leaks', () => {
    expect(sanitize({ name: 'Jane', contact: { email: 'jane@x.com' }, tags: ['a', ''] })).toEqual({
      name: { present: true },
      contact: { email: { present: true } },
      tags: [{ present: true }, { present: false }],
    });
  });

  it('passes through non-string primitives unchanged', () => {
    expect(sanitize({ n: 3, ok: true, nothing: null })).toEqual({
      n: 3,
      ok: true,
      nothing: null,
    });
  });
});
