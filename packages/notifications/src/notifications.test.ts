import { describe, expect, it } from 'vitest';
import { DigestTransport, EmailTransport, getTransport, InAppTransport } from './index';

describe('getTransport', () => {
  it('selects a transport by name, defaulting to in_app', () => {
    expect(getTransport().name).toBe('in_app');
    expect(getTransport('in_app')).toBeInstanceOf(InAppTransport);
    expect(getTransport('email')).toBeInstanceOf(EmailTransport);
    expect(getTransport('digest')).toBeInstanceOf(DigestTransport);
  });

  it('the in_app transport enqueues without throwing', async () => {
    await expect(
      new InAppTransport().send({ userId: 'u1', type: 't', title: 'a', body: 'b' }),
    ).resolves.toBeUndefined();
  });

  it('unwired transports throw a clear not-implemented error', async () => {
    await expect(
      new EmailTransport().send({ userId: 'u1', type: 't', title: 'a', body: 'b' }),
    ).rejects.toThrow(/not wired/);
  });
});
