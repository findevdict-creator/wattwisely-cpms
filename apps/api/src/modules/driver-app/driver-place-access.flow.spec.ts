import { TestDatabase } from '@wattwisely/db/testing';
import { DriverChargesFixture } from './driver-charges.fixture';

/**
 * Module 19 part 2: what keeps a logged-in driver from charging, decided as the gateway
 * decides a card tap, and the operator's own record that a guest record must never replace.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('Driver place access', () => {
  const stage = new DriverChargesFixture();
  const { api } = stage;

  beforeAll(() => stage.start());
  afterAll(() => stage.stop());

  it('refuses a record the operator already keeps unlinked, a blocked driver and a private site', async () => {
    const stranger = { keycloakId: 'kc-sam', email: 'sam@example.com', name: 'Sam' };
    await api.call('POST', '/v1/drivers', {
      token: stage.owner,
      body: { name: 'Sam Known', email: stranger.email },
    });
    const samToken = await api.issuer.signForDriver(stranger);
    await stage.saveCard(samToken);
    const twice = await stage.startCharge(samToken, 3, true);
    expect(twice.json().code).toBe('driver_record_exists');

    await api.data.sql(`update drivers set status = 'blocked', blocked_at = now() where id = $1`, [
      stage.danaDriverId,
    ]);
    expect((await stage.place(stage.danaToken, 3)).json().access.reason).toBe('driver_blocked');
    expect((await stage.startCharge(stage.danaToken, 3)).json().code).toBe('driver_blocked');
    await api.data.sql(`update drivers set status = 'active', blocked_at = null where id = $1`, [
      stage.danaDriverId,
    ]);

    await api.data.sql(`update sites set visibility = 'private' where id = $1`, [stage.riverside]);
    expect((await stage.place(stage.danaToken, 3)).json().access).toMatchObject({
      is_private_site: true,
      is_member: false,
      reason: 'private_site',
    });
    await api.data.sql(`update sites set visibility = 'public' where id = $1`, [stage.riverside]);
  });
});
