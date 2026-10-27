import { TestData, TestDatabase, TestPlatform } from '@wattwisely/db/testing';
import { PaymentsFixture } from '../payments/payments.fixture';

/** Module 17: a tenant's WhatsApp channel and Meta's subscription check. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Messaging channel', () => {
  const fixture = new PaymentsFixture();
  const { api } = fixture;
  let acme: string;
  let owner: string;

  beforeAll(async () => {
    await fixture.start();
    acme = fixture.acme;
    owner = fixture.ownerToken;
    await api.platform.subscription(acme, TestPlatform.PLAN_IDS.growth);
    await api.platform.entitlement(acme, 'messaging_charging');
  });

  afterAll(() => fixture.stop());

  it('shows an empty channel with the webhook address, then saves one with If-Match 0', async () => {
    const empty = await api.call('GET', '/v1/messaging/channel', { token: owner });
    const saved = await api.call('PUT', '/v1/messaging/channel', {
      token: owner,
      version: 0,
      body: {
        phone_number_id: '106',
        display_phone_number: '+44 7700 900000',
        greeting: 'Hi from Acme Charging!',
      },
    });
    const again = await api.call('PUT', '/v1/messaging/channel', {
      token: owner,
      version: 0,
      body: { phone_number_id: '106', display_phone_number: '+44 7700 900000' },
    });

    expect(empty.statusCode).toBe(200);
    expect(empty.json()).toMatchObject({
      phone_number_id: '',
      version: 0,
      is_platform_token_configured: true,
      webhook_url: 'http://api.test/v1/public/messaging/whatsapp',
    });
    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({
      phone_number_id: '106',
      display_phone_number: '+44 7700 900000',
      has_access_token: false,
      greeting: 'Hi from Acme Charging!',
      is_active: true,
      version: 1,
    });
    expect(again.statusCode).toBe(409);
    const audit = await api.call('GET', '/v1/audit-log?target_type=messaging_channel', {
      token: owner,
    });
    expect(audit.json().items[0]).toMatchObject({
      action: 'messaging.channel_created',
      target_label: '+44 7700 900000',
    });
  });

  it('refuses the same number for another company', async () => {
    const volt = await api.data.tenant('volt-hotels');
    await api.platform.subscription(volt, TestPlatform.PLAN_IDS.growth);
    await api.platform.entitlement(volt, 'messaging_charging');
    const hugo = await api.data.person('hugo@volt.test', 'Hugo');
    await api.data.member(volt, hugo, TestData.ROLE_IDS.owner);
    const taken = await api.call('PUT', '/v1/messaging/channel', {
      token: await api.issuer.signFor(hugo),
      version: 0,
      body: { phone_number_id: '106', display_phone_number: '+44 7700 900999' },
    });

    expect(taken.statusCode).toBe(409);
    expect(taken.json().code).toBe('messaging_number_taken');
  });

  it('answers Meta’s subscription check only with our verify token', async () => {
    const ok = await api.call(
      'GET',
      '/v1/public/messaging/whatsapp?hub.mode=subscribe&hub.verify_token=verify-me&hub.challenge=4242',
    );
    const wrong = await api.call(
      'GET',
      '/v1/public/messaging/whatsapp?hub.mode=subscribe&hub.verify_token=nope&hub.challenge=4242',
    );

    expect(ok.statusCode).toBe(200);
    expect(ok.body).toBe('4242');
    expect(ok.headers['content-type']).toMatch(/text\/plain/);
    expect(wrong.statusCode).toBe(403);
  });
});
