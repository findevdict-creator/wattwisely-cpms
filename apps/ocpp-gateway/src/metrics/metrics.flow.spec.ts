import { ChargerMessages } from '@wattwisely/charger-sim';
import { TestDatabase } from '@wattwisely/db/testing';
import { TestGateway } from '../testing/test-gateway';

/** Module 12: GET /metrics tells the monitoring what the gateway is doing. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Gateway metrics', () => {
  const gateway = new TestGateway();
  let acme: string;
  let site: string;

  const metrics = async () =>
    (await gateway.app.inject({ method: 'GET', url: '/metrics' })).body.split('\n');
  const value = async (series: string) => {
    const line = (await metrics()).find((candidate) => candidate.startsWith(`${series} `));
    return line === undefined ? undefined : Number(line.split(' ')[1]);
  };

  beforeAll(async () => {
    await gateway.start();
    acme = await gateway.data.tenant('acme-charging');
    site = await gateway.data.site(acme, 'Riverside');
  });

  afterAll(async () => gateway.stop());

  it('counts refused upgrades by reason and open connections', async () => {
    await expect(gateway.charger('WW-NOBODY').connect()).rejects.toMatchObject({ status: 404 });
    await gateway.data.charger(acme, site, 'WW-METRICS');
    const charger = gateway.charger('WW-METRICS');
    await charger.connect();

    expect(
      await value(
        'wattwisely_ocpp_upgrades_total{result="unknown_charger",service="ocpp-gateway"}',
      ),
    ).toBe(1);
    expect(
      await value('wattwisely_ocpp_upgrades_total{result="accepted",service="ocpp-gateway"}'),
    ).toBe(1);
    expect(await value('wattwisely_ocpp_connections{service="ocpp-gateway"}')).toBe(1);
    await charger.close();
  });

  it('counts and times the CALLs from chargers, with unknown actions as "other"', async () => {
    await gateway.data.charger(acme, site, 'WW-CALLS');
    const charger = gateway.charger('WW-CALLS');
    await charger.connect();
    const messages = new ChargerMessages(charger);
    await messages.boot();
    await messages.heartbeat();
    await charger.call('MadeUpAction', {});

    expect(
      await value(
        'wattwisely_ocpp_calls_total{action="BootNotification",result="ok",service="ocpp-gateway"}',
      ),
    ).toBe(1);
    expect(
      await value(
        'wattwisely_ocpp_calls_total{action="other",result="NotImplemented",service="ocpp-gateway"}',
      ),
    ).toBe(1);
    expect(
      await value(
        'wattwisely_ocpp_call_duration_seconds_count{service="ocpp-gateway",action="Heartbeat"}',
      ),
    ).toBe(1);
    await charger.close();
  });

  it('counts commands by outcome and times the charger replies', async () => {
    const chargerId = await gateway.data.charger(acme, site, 'WW-COMMANDS');
    const charger = gateway.charger('WW-COMMANDS');
    await charger.connect();
    await new ChargerMessages(charger).boot();

    await gateway.queueCommand({
      tenantId: acme,
      chargerId,
      action: 'reset',
      payload: { type: 'Soft' },
    });
    const call = await charger.nextCall();
    charger.reply(call, { status: 'Accepted' });
    await gateway.eventually(`select 1 from charger_commands where status = 'accepted'`);

    expect(
      await value(
        'wattwisely_ocpp_commands_total{action="reset",status="accepted",service="ocpp-gateway"}',
      ),
    ).toBe(1);
    expect(
      await value(
        'wattwisely_ocpp_command_duration_seconds_count{service="ocpp-gateway",action="reset"}',
      ),
    ).toBe(1);
    await charger.close();
  });
});
