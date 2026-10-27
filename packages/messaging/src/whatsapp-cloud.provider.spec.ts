import { WhatsAppCloudProvider } from './whatsapp-cloud.provider';

describe('WhatsAppCloudProvider', () => {
  it('builds a text message', () => {
    expect(WhatsAppCloudProvider.body({ to: '447700900123', text: 'Hi' })).toEqual({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: '447700900123',
      type: 'text',
      text: { preview_url: true, body: 'Hi' },
    });
  });

  it('builds an interactive message for a reply with buttons, at most three of twenty characters', () => {
    const body = WhatsAppCloudProvider.body({
      to: '447700900123',
      text: 'Charging',
      buttons: [
        { id: 'stop', title: 'Stop charging right now please' },
        { id: 'a', title: 'A' },
        { id: 'b', title: 'B' },
        { id: 'c', title: 'C' },
      ],
    });
    const interactive = body['interactive'] as {
      action: { buttons: { reply: { title: string } }[] };
    };
    expect(body['type']).toBe('interactive');
    expect(interactive.action.buttons).toHaveLength(3);
    expect(interactive.action.buttons[0].reply.title).toBe('Stop charging right');
  });

  it('is disabled without a platform token, and fails a send without any token', async () => {
    const provider = new WhatsAppCloudProvider(WhatsAppCloudProvider.DEFAULT_API_URL, '');
    expect(provider.isEnabled).toBe(false);
    const result = await provider.send(
      { phoneNumberId: '106', accessToken: '' },
      { to: '447700900123', text: 'Hi' },
    );
    expect(result).toMatchObject({ isSent: false, isRetryable: false });
    expect(result.error).toMatch(/access token/);
  });
});
