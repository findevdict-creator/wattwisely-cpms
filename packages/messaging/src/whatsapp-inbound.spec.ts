import { WhatsAppInbound } from './whatsapp-inbound';

describe('WhatsAppInbound', () => {
  const value = (messages: unknown[], statuses: unknown[] = []) => ({
    object: 'whatsapp_business_account',
    entry: [
      {
        id: '1',
        changes: [
          {
            field: 'messages',
            value: {
              messaging_product: 'whatsapp',
              metadata: { display_phone_number: '15550001111', phone_number_id: '106' },
              messages,
              statuses,
            },
          },
        ],
      },
    ],
  });

  it('reads texts and button taps, with the number they came to', () => {
    const body = value([
      {
        id: 'wamid.1',
        from: '+44 7700 900123',
        timestamp: '1700000000',
        type: 'text',
        text: { body: 'charge ACME-1/1' },
      },
      {
        id: 'wamid.2',
        from: '447700900123',
        timestamp: '1700000001',
        type: 'interactive',
        interactive: { type: 'button_reply', button_reply: { id: 'stop', title: 'Stop charging' } },
      },
    ]);
    expect(WhatsAppInbound.parse(body)).toEqual([
      {
        providerMessageId: 'wamid.1',
        phoneNumberId: '106',
        from: '447700900123',
        text: 'charge ACME-1/1',
        isButton: false,
        receivedAt: new Date(1_700_000_000_000),
      },
      {
        providerMessageId: 'wamid.2',
        phoneNumberId: '106',
        from: '447700900123',
        text: 'stop',
        isButton: true,
        receivedAt: new Date(1_700_000_001_000),
      },
    ]);
  });

  it('leaves out status updates, media and malformed bodies', () => {
    const body = value(
      [
        {
          id: 'wamid.3',
          from: '447700900123',
          timestamp: '1700000000',
          type: 'image',
          image: { id: 'x' },
        },
      ],
      [{ id: 'wamid.1', status: 'delivered' }],
    );
    expect(WhatsAppInbound.parse(body)).toEqual([]);
    expect(WhatsAppInbound.parse(null)).toEqual([]);
    expect(
      WhatsAppInbound.parse({ entry: [{ changes: [{ value: { messages: [{ id: 'x' }] } }] }] }),
    ).toEqual([]);
  });
});
