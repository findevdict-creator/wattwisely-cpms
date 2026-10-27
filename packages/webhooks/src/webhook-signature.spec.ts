import { WebhookSignature } from './webhook-signature';

describe('WebhookSignature', () => {
  const secret = 'whsec_test';
  const body = '{"type":"ping"}';
  const signedAt = new Date('2026-10-24T12:00:00Z');

  it('signs the timestamp and the body, and verifies its own signature', () => {
    const header = WebhookSignature.sign(secret, body, signedAt);

    expect(header).toMatch(/^t=\d{10},v1=[0-9a-f]{64}$/);
    expect(WebhookSignature.verify(secret, header, body, signedAt)).toBe(true);
    expect(
      WebhookSignature.verify(secret, header, body, new Date(signedAt.getTime() + 299_000)),
    ).toBe(true);
  });

  it('refuses another secret, another body, a stale timestamp and a malformed header', () => {
    const header = WebhookSignature.sign(secret, body, signedAt);

    expect(WebhookSignature.verify('whsec_other', header, body, signedAt)).toBe(false);
    expect(WebhookSignature.verify(secret, header, '{"type":"pong"}', signedAt)).toBe(false);
    expect(
      WebhookSignature.verify(secret, header, body, new Date(signedAt.getTime() + 301_000)),
    ).toBe(false);
    expect(WebhookSignature.verify(secret, 't=abc,v1=00', body, signedAt)).toBe(false);
    expect(WebhookSignature.verify(secret, '', body, signedAt)).toBe(false);
  });
});
