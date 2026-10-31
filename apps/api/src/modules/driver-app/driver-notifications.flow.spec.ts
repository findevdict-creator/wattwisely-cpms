import { TestDatabase } from '@wattwisely/db/testing';
import { DriverChargesFixture } from './driver-charges.fixture';

/**
 * Module 34: the driver's notification choices and phones. A phone registers its push token
 * and moves to whoever signs in on it next; turning e-mail on gives a charge started from the
 * app the same e-mail subscription the QR page gives a guest.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('Driver notifications', () => {
  const stage = new DriverChargesFixture();
  const { api } = stage;
  const token = 'fcm-token-of-danas-phone-0001';

  beforeAll(async () => {
    await stage.start();
    await stage.saveCard(stage.danaToken);
  });
  afterAll(() => stage.stop());

  it('starts with pushes on and e-mail off, and keeps what the driver switches', async () => {
    const first = await api.call('GET', '/v1/driver/me/notifications', { token: stage.danaToken });
    expect(first.json()).toEqual({
      started: true,
      nearly_full: true,
      finished: true,
      idle_warning: true,
      is_push_enabled: true,
      is_email_enabled: false,
      email: 'dana@example.com',
      device_count: 0,
    });
    const body = { ...first.json(), nearly_full: false, is_email_enabled: true };
    delete body.email;
    delete body.device_count;
    const saved = await api.call('PUT', '/v1/driver/me/notifications', {
      token: stage.danaToken,
      body,
    });
    expect(saved.json()).toMatchObject({ nearly_full: false, is_email_enabled: true });
  });

  it('registers a phone, moves it to the next login on it, and forgets it at sign-out', async () => {
    const register = (driverToken: string) =>
      api.call('PUT', '/v1/driver/devices', {
        token: driverToken,
        body: { platform: 'android', token },
      });
    expect((await register(stage.danaToken)).statusCode).toBe(204);
    expect((await register(stage.danaToken)).statusCode).toBe(204);
    const devices = () =>
      api.data.sql(`select driver_account_id from driver_devices where token = $1`, [token]);
    expect((await devices()).rows).toHaveLength(1);
    await register(stage.guyToken);
    const guys = await api.call('GET', '/v1/driver/me/notifications', { token: stage.guyToken });
    expect(guys.json().device_count).toBe(1);

    const removed = await api.call('DELETE', `/v1/driver/devices/${token}`, {
      token: stage.guyToken,
    });
    expect(removed.statusCode).toBe(204);
    expect((await devices()).rows).toHaveLength(0);
    expect(
      (
        await api.call('PUT', '/v1/driver/devices', {
          token: stage.danaToken,
          body: { platform: 'pc', token },
        })
      ).statusCode,
    ).toBe(400);
  });

  it('subscribes a charge from the app to e-mails with the driver’s choices', async () => {
    const start = await stage.startCharge(stage.danaToken, 1);
    expect(start.statusCode).toBe(201);
    const subscription = await api.data.sql(
      `select email, wants_started, wants_nearly_full from session_subscriptions where session_id = $1`,
      [start.json().id],
    );
    expect(subscription.rows).toEqual([
      { email: 'dana@example.com', wants_started: true, wants_nearly_full: false },
    ]);
  });
});
