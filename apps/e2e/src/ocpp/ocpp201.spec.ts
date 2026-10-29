import { expect, test } from '@playwright/test';
import { ChargerMessages201, SimulatedCharger } from '@wattwisely/charger-sim';
import { Database } from '../support/database';
import { DemoUsers } from '../support/demo-users';
import { StackUrls } from '../support/stack-urls';

// Module 18 (OCPP 2.0.1): the same gateway speaks 2.0.1 to a charging station that offers it.
test.describe('OCPP 2.0.1 gateway', () => {
  let socket: SimulatedCharger;
  let station: ChargerMessages201;

  test.beforeEach(async () => {
    socket = new SimulatedCharger({
      url: StackUrls.OCPP,
      identity: DemoUsers.RIVERSIDE_SECOND_CHARGER,
      protocols: ChargerMessages201.PROTOCOLS,
    });
    socket.on('SetChargingProfile', () => ({ status: 'Accepted' }));
    station = new ChargerMessages201(socket);
    await socket.connect();
  });

  test.afterEach(async () => {
    await socket.close().catch(() => undefined);
  });

  test(
    'a station offering 2.0.1 is answered in 2.0.1, boots and reports its EVSEs',
    { tag: ['@module-18'] },
    async () => {
      expect(socket.protocol).toBe('ocpp2.0.1');
      expect(await station.boot()).toMatchObject({
        status: 'Accepted',
        interval: expect.any(Number),
      });
      expect(await station.heartbeat()).toHaveProperty('currentTime');
      expect(await station.status(1, 'Available')).toBeDefined();
    },
  );

  test(
    '2.0.1 Authorize accepts Dana’s card and refuses a blocked one',
    { tag: ['@module-18', '@module-13'] },
    async () => {
      await station.boot();
      expect((await station.authorize('DEMO-CARD-1')).idTokenInfo.status).toBe('Accepted');
      expect((await station.authorize('DEMO-CARD-4')).idTokenInfo.status).not.toBe('Accepted');
    },
  );

  test(
    'a TransactionEvent Started, Updated and Ended becomes a completed, metered session',
    { tag: ['@module-18', '@module-5'] },
    async () => {
      test.setTimeout(120_000);
      const minutesAgo = (minutes: number) => new Date(Date.now() - minutes * 60_000);
      const transactionId = `e2e-${Date.now()}`;
      await station.boot();
      const started = await station.transactionStarted(transactionId, {
        idToken: 'DEMO-CARD-1',
        meterWh: 0,
        at: minutesAgo(20),
      });
      expect(started.idTokenInfo?.status ?? 'Accepted').toBe('Accepted');
      await station.transactionUpdated(transactionId, {
        chargingState: 'Charging',
        meterWh: 5000,
        powerW: 20_000,
        at: minutesAgo(10),
      });
      await station.transactionEnded(transactionId, { meterWh: 9000, at: minutesAgo(1) });
      const session = () =>
        Database.one<{ status: string; energy_wh: string }>(
          `select s.status, s.energy_wh::text as energy_wh from charging_sessions s join chargers c on c.id = s.charger_id
         where c.ocpp_identity = $1 order by s.created_at desc limit 1`,
          [DemoUsers.RIVERSIDE_SECOND_CHARGER],
        );
      await expect
        .poll(async () => (await session())?.status, { timeout: 60_000 })
        .toBe('completed');
      expect((await session())?.energy_wh).toBe('9000');
    },
  );
});
