import { TestDatabase } from '@wattwisely/db/testing';
import { TestWorker } from '../testing/test-worker';
import { LoadBalanceJob } from './load-balance.job';

/** Module 17: the worker shares a site's cap among its chargers and keeps the chargers told. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Load balance job', () => {
  const worker = new TestWorker();
  let acme: string;
  let site: string;
  let policy: string;
  let entitlement: string;
  const chargers: Record<string, string> = {};
  const connectors: Record<string, string> = {};
  let job: LoadBalanceJob;

  beforeAll(async () => {
    await worker.start();
    job = worker.app.get(LoadBalanceJob);
    acme = await worker.data.tenant('acme-charging');
    entitlement = await worker.platform.entitlement(acme, 'load_management');
    site = await worker.data.site(acme, 'Riverside');
    for (const name of ['A', 'B', 'C', 'D']) {
      chargers[name] = await worker.data.charger(acme, site, `WW-${name}`);
      connectors[name] = await worker.data.connector(acme, chargers[name], 1, 22);
      if (name !== 'D') {
        await worker.addons.chargerOnline(acme, chargers[name]);
      }
    }
    await worker.addons.connectorStatus(connectors['A'], 'charging');
    await worker.addons.connectorStatus(connectors['B'], 'preparing');
    policy = await worker.addons.loadPolicy(acme, site, { limitKw: 30, minPowerKw: 4.2 });
  });

  afterAll(async () => {
    await worker.stop();
  });

  /** The commands queued for a charger, newest first. */
  async function commandsOf(name: string) {
    const { rows } = await worker.data.sql(
      `select action, payload, status from charger_commands where charger_id = $1 order by created_at desc`,
      [chargers[name]],
    );
    return rows;
  }

  async function allocationOf(name: string) {
    return worker.row(
      `select limit_w, reason, is_charging, is_applied, attempts, last_error, command_id from charger_load_allocations where charger_id = $1`,
      [chargers[name]],
    );
  }

  async function answer(name: string, status: string, error: string | null = null) {
    await worker.data.sql(
      `update charger_commands set status = $2, error = $3, completed_at = now()
       where charger_id = $1 and status = 'queued'`,
      [chargers[name], status, error],
    );
  }

  it('gives charging chargers their share, idle ones a reserve, and sends the caps to the online ones', async () => {
    const sent = await job.runOnce(new Date());

    expect(sent).toBe(3);
    expect(await commandsOf('A')).toEqual([
      {
        action: 'set_charging_profile',
        payload: { profile_id: 1700, limit_w: 10_800 },
        status: 'queued',
      },
    ]);
    expect((await commandsOf('C'))[0].payload).toEqual({ profile_id: 1700, limit_w: 4200 });
    expect(await commandsOf('D')).toEqual([]);
    expect(await allocationOf('A')).toMatchObject({
      limit_w: 10_800,
      reason: 'share',
      is_charging: true,
      is_applied: false,
      attempts: 1,
    });
    expect(await allocationOf('C')).toMatchObject({ limit_w: 4200, reason: 'idle', attempts: 1 });
    expect(await allocationOf('D')).toMatchObject({
      limit_w: 4200,
      reason: 'idle',
      is_applied: false,
      attempts: 0,
      command_id: null,
    });
  });

  it('marks accepted caps applied, and tries a rejected one again after a wait', async () => {
    await answer('A', 'accepted');
    await answer('B', 'accepted');
    await answer('C', 'rejected', 'The charger answered Rejected.');
    const now = new Date();

    expect(await job.runOnce(now)).toBe(0);
    expect(await allocationOf('A')).toMatchObject({
      is_applied: true,
      attempts: 0,
      last_error: null,
      command_id: null,
    });
    expect(await allocationOf('C')).toMatchObject({
      is_applied: false,
      attempts: 1,
      last_error: 'The charger answered Rejected.',
      command_id: null,
    });

    expect(await job.runOnce(new Date(now.getTime() + 31_000))).toBe(1);
    expect(await commandsOf('C')).toHaveLength(2);
    expect(await allocationOf('C')).toMatchObject({ is_applied: false, attempts: 2 });
  });

  it('shares the cap again when a car plugs in, and leaves a charger with a cap on the way alone', async () => {
    await worker.addons.connectorStatus(connectors['C'], 'charging');

    expect(await job.runOnce(new Date())).toBe(2);
    expect((await commandsOf('A'))[0].payload).toEqual({ profile_id: 1700, limit_w: 8600 });
    expect((await commandsOf('B'))[0].payload).toEqual({ profile_id: 1700, limit_w: 8600 });
    expect(await commandsOf('C')).toHaveLength(2);
    expect(await allocationOf('C')).toMatchObject({ limit_w: 4200, is_charging: true });
    expect(await allocationOf('D')).toMatchObject({ limit_w: 4200, reason: 'idle' });
  });

  it('sends the cap again after the charger boots', async () => {
    await answer('A', 'accepted');
    await answer('B', 'accepted');
    await answer('C', 'accepted');
    // C's accepted cap is the old 4200 W; the plan says 8600 W now, so C gets that one.
    expect(await job.runOnce(new Date())).toBe(1);
    expect((await commandsOf('C'))[0].payload).toEqual({ profile_id: 1700, limit_w: 8600 });
    await answer('C', 'accepted');
    expect(await job.runOnce(new Date())).toBe(0);
    await worker.addons.chargerBooted(chargers['A'], new Date(Date.now() + 1000));

    expect(await job.runOnce(new Date())).toBe(1);
    expect((await commandsOf('A'))[0]).toMatchObject({
      action: 'set_charging_profile',
      status: 'queued',
    });
  });

  it('clears every cap when the policy is switched off, and does nothing without the add-on', async () => {
    await worker.data.sql('update site_load_policies set is_enabled = false where id = $1', [
      policy,
    ]);

    expect(await job.runOnce(new Date())).toBe(4);
    for (const name of ['A', 'B', 'C', 'D']) {
      expect((await commandsOf(name))[0]).toMatchObject({
        action: 'clear_charging_profile',
        payload: { profile_id: 1700 },
      });
      expect(await allocationOf(name)).toBeNull();
    }

    await worker.data.sql('update site_load_policies set is_enabled = true where id = $1', [
      policy,
    ]);
    await worker.data.sql('delete from tenant_entitlements where id = $1', [entitlement]);
    expect(await job.runOnce(new Date())).toBe(0);
    expect(await allocationOf('A')).toBeNull();
  });
});
