import { WhatsAppSignature } from './whatsapp-signature';

describe('WhatsAppSignature', () => {
  const secret = 'app-secret';
  const body = '{"object":"whatsapp_business_account"}';

  it('accepts the signature Meta would send', () => {
    const header = WhatsAppSignature.sign(secret, body);
    expect(header.startsWith('sha256=')).toBe(true);
    expect(WhatsAppSignature.verify(secret, header, body)).toBe(true);
    expect(WhatsAppSignature.verify(secret, header, Buffer.from(body))).toBe(true);
  });

  it('rejects a changed body, another secret, or no header', () => {
    const header = WhatsAppSignature.sign(secret, body);
    expect(WhatsAppSignature.verify(secret, header, body + ' ')).toBe(false);
    expect(WhatsAppSignature.verify('other', header, body)).toBe(false);
    expect(WhatsAppSignature.verify(secret, undefined, body)).toBe(false);
    expect(WhatsAppSignature.verify(secret, 'sha256=zz', body)).toBe(false);
    expect(WhatsAppSignature.verify('', header, body)).toBe(false);
  });
});
