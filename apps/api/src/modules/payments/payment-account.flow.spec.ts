import { TestDatabase } from '@wattwisely/db/testing';
import { PaymentsFixture } from './payments.fixture';

/** Connecting the company to Stripe, with the provider in memory. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Payment account', () => {
  const fixture = new PaymentsFixture();
  const { api } = fixture;

  beforeAll(() => fixture.start());
  afterAll(() => fixture.stop());

  it('connects the company to Stripe and hears from the webhook when onboarding is done', async () => {
    const before = await api.call('GET', '/v1/payment-account', fixture.asOwner());
    expect(before.json()).toMatchObject({ status: 'not_connected', is_provider_enabled: true });

    const connected = await api.call(
      'POST',
      '/v1/payment-account',
      fixture.asOwner({ country: 'GB' }),
    );
    expect(connected.statusCode).toBe(201);
    expect(connected.json()).toMatchObject({
      status: 'pending',
      provider: 'fake',
      country: 'GB',
      hold_amount: 5000,
      requirements_due: ['external_account'],
    });
    const providerAccountId = connected.json().provider_account_id;
    const again = await api.call('POST', '/v1/payment-account', fixture.asOwner({ country: 'GB' }));
    expect(again.statusCode).toBe(409);

    const link = await api.call('POST', '/v1/payment-account/onboarding-link', fixture.asOwner());
    expect(link.json().url).toContain(providerAccountId);

    api.gateway.enable(providerAccountId);
    const event = {
      id: 'evt_1',
      type: 'account.updated',
      account: providerAccountId,
      object_id: providerAccountId,
    };
    expect((await fixture.webhook(event)).json()).toEqual({ outcome: 'processed' });
    expect((await fixture.webhook(event)).json()).toEqual({ outcome: 'duplicate' });
    expect((await fixture.webhook(event, 'forged')).statusCode).toBe(400);

    const after = await api.call('GET', '/v1/payment-account', fixture.asOwner());
    expect(after.json()).toMatchObject({
      status: 'active',
      is_charges_enabled: true,
      requirements_due: [],
    });
  });

  it('changes the card hold with the version seen, and records it', async () => {
    const account = (await api.call('GET', '/v1/payment-account', fixture.asOwner())).json();

    const stale = await api.call('PATCH', '/v1/payment-account', {
      ...fixture.asOwner({ hold_amount: 3000 }),
      version: account.version + 1,
    });
    expect(stale.json()).toMatchObject({ status: 409, code: 'version_conflict' });

    const changed = await api.call('PATCH', '/v1/payment-account', {
      ...fixture.asOwner({ hold_amount: 3000 }),
      version: account.version,
    });
    expect(changed.json()).toMatchObject({ hold_amount: 3000, version: account.version + 1 });
    const audit = await api.call(
      'GET',
      '/v1/audit-log?target_type=payment_account',
      fixture.asOwner(),
    );
    expect(audit.json().items.map((entry: { action: string }) => entry.action)).toEqual([
      'payments.hold_changed',
      'payments.account_connected',
    ]);
  });
});
