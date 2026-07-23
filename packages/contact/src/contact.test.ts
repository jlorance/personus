import { describe, expect, it } from 'vitest';
import { EmailRelay, getContactRelay, InAppRelay, SignalRelay } from './index';

describe('getContactRelay', () => {
  it('selects the relay for the preferred mode, defaulting to in_app', () => {
    expect(getContactRelay().mode).toBe('in_app');
    expect(getContactRelay('in_app')).toBeInstanceOf(InAppRelay);
    expect(getContactRelay('email_relay')).toBeInstanceOf(EmailRelay);
    expect(getContactRelay('signal')).toBeInstanceOf(SignalRelay);
  });

  it('the in_app relay delivers and returns a receipt with no raw contact details', async () => {
    const receipt = await new InAppRelay().deliver({
      contactRequestId: 'con_1',
      toPersonaUri: 'per_a',
      fromLabel: 'per_b',
      reason: 'collaboration',
      message: 'hi',
    });
    expect(receipt).toEqual({ mode: 'in_app', delivered: true, reference: 'inapp:con_1' });
  });

  it('unwired relays throw a clear not-implemented error', async () => {
    await expect(
      new EmailRelay().deliver({
        contactRequestId: 'con_1',
        toPersonaUri: 'per_a',
        fromLabel: 'per_b',
        reason: 'x',
        message: 'y',
      }),
    ).rejects.toThrow(/not wired/);
  });
});
