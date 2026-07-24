import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { verifyDiscord, verifySlack, verifyTelegram } from './platform-verify';

describe('verifySlack', () => {
  const secret = 'shhh';
  const body = '{"externalRef":"C1","text":"hi","senderRef":"U1"}';
  const ts = Math.floor(Date.now() / 1000).toString();
  const sign = (t: string, b: string) =>
    `v0=${crypto.createHmac('sha256', secret).update(`v0:${t}:${b}`).digest('hex')}`;

  it('accepts a correctly-signed, fresh request', () => {
    expect(verifySlack(secret, ts, sign(ts, body), body)).toBe(true);
  });
  it('rejects a tampered body, wrong secret, or missing parts', () => {
    expect(verifySlack(secret, ts, sign(ts, body), `${body} tampered`)).toBe(false);
    expect(verifySlack('other', ts, sign(ts, body), body)).toBe(false);
    expect(verifySlack(secret, ts, null, body)).toBe(false);
    expect(verifySlack('', ts, sign(ts, body), body)).toBe(false);
  });
  it('rejects a stale timestamp (replay window)', () => {
    const old = (Math.floor(Date.now() / 1000) - 600).toString();
    expect(verifySlack(secret, old, sign(old, body), body)).toBe(false);
  });
});

describe('verifyDiscord', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519');
  const pubHex = Buffer.from(publicKey.export({ format: 'der', type: 'spki' }))
    .subarray(-32)
    .toString('hex');
  const body = '{"externalRef":"G1","text":"hey","senderRef":"D1"}';
  const ts = '1700000000';
  const sig = crypto.sign(null, Buffer.from(ts + body), privateKey).toString('hex');

  it('accepts a valid Ed25519 signature', () => {
    expect(verifyDiscord(pubHex, ts, sig, body)).toBe(true);
  });
  it('rejects a tampered body or wrong key', () => {
    expect(verifyDiscord(pubHex, ts, sig, `${body}x`)).toBe(false);
    const other = crypto.generateKeyPairSync('ed25519').publicKey;
    const otherHex = Buffer.from(other.export({ format: 'der', type: 'spki' }))
      .subarray(-32)
      .toString('hex');
    expect(verifyDiscord(otherHex, ts, sig, body)).toBe(false);
    expect(verifyDiscord(pubHex, ts, null, body)).toBe(false);
  });
});

describe('verifyTelegram', () => {
  it('accepts a matching secret token and rejects otherwise', () => {
    expect(verifyTelegram('tok', 'tok')).toBe(true);
    expect(verifyTelegram('tok', 'nope')).toBe(false);
    expect(verifyTelegram('tok', null)).toBe(false);
    expect(verifyTelegram('', 'tok')).toBe(false);
  });
});
