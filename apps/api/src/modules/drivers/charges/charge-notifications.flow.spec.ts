import { TestDatabase } from '@wattwisely/db/testing';
import { PaymentsFixture } from '../../payments/payments.fixture';

/** Story NTF-01: a driver asks for e-mail updates on the charging page, with the charge key. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Charge e-mail updates', () => {
  const fixture = new PaymentsFixture();
  const { api } = fixture;
  let chargeKey: string;

  beforeAll(async () => {
    await fixture.start();
    await fixture.connectedAccount();
    chargeKey = (await fixture.startCharge(1)).json().charge_key;
  });

  afterAll(() => fixture.stop());

  const url = () => `/v1/public/charges/${chargeKey}/notifications`;

  it('has every update on and no address until the driver gives one', async () => {
    const response = await api.call('GET', url());

    expect(response.json()).toEqual({
      email: null,
      started: true,
      nearly_full: true,
      finished: true,
      idle_warning: true,
      is_undeliverable: false,
    });
  });

  it('saves the address and the choices, and a new address clears a bounce', async () => {
    const body = {
      email: 'dana@driver.test',
      started: false,
      nearly_full: true,
      finished: true,
      idle_warning: false,
    };
    const saved = await api.call('PUT', url(), { body });
    await api.data.sql('update session_subscriptions set is_undeliverable = true');
    const same = await api.call('PUT', url(), { body });
    const changed = await api.call('PUT', url(), { body: { ...body, email: 'dana@other.test' } });

    expect(saved.json()).toMatchObject({
      email: 'dana@driver.test',
      started: false,
      idle_warning: false,
    });
    expect(same.json().is_undeliverable).toBe(true);
    expect(changed.json()).toMatchObject({ email: 'dana@other.test', is_undeliverable: false });
  });

  it('stops all e-mails when asked, and knows nothing of a wrong key', async () => {
    const removed = await api.call('DELETE', url());
    const wrong = await api.call(
      'GET',
      `/v1/public/charges/${chargeKey.slice(0, -2)}xx/notifications`,
    );
    const bad = await api.call('PUT', url(), { body: { email: 'not-an-address' } });

    expect(removed.statusCode).toBe(200);
    expect(removed.json().email).toBeNull();
    expect(
      await api.data.sql('select count(*)::int as n from session_subscriptions'),
    ).toMatchObject({
      rows: [{ n: 0 }],
    });
    expect(wrong.statusCode).toBe(404);
    expect(bad.statusCode).toBe(400);
  });
});
