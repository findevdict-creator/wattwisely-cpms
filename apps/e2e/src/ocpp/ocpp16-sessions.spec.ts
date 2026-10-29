import { expect, test } from '@playwright/test';
import { Charger16 } from '../support/charger16';
import { Database } from '../support/database';
import { DemoUsers } from '../support/demo-users';

// Module 4 (transactions), module 5 (pricing), module 13 (RFID card access), module 17 (load
// management) and module 19 (who pays), against the running gateway and worker.
test.describe('OCPP 1.6J gateway: cards and transactions', () => {
  let charger: Charger16;

  test.afterEach(async () => {
    await charger?.socket.close().catch(() => undefined);
  });

  test(
    'RFID cards: Dana is accepted; a lost, a blocked and an unknown card are refused',
    { tag: ['@module-13'] },
    async () => {
      charger = await new Charger16(DemoUsers.DEPOT_CHARGER).boot();
      const statusOf = async (idTag: string) =>
        (await charger.messages.authorize(idTag)).idTagInfo.status;
      expect(await statusOf('DEMO-CARD-1')).toBe('Accepted');
      expect(await statusOf('DEMO-CARD-2')).not.toBe('Accepted');
      expect(await statusOf('DEMO-CARD-4')).not.toBe('Accepted');
      expect(await statusOf('NO-SUCH-CARD')).not.toBe('Accepted');
    },
  );

  test(
    'a paying driver without a saved card is refused (Priya, DEMO-CARD-3)',
    { tag: ['@module-19'] },
    async () => {
      charger = await new Charger16(DemoUsers.RIVERSIDE_CHARGER).boot();
      expect((await charger.messages.authorize('DEMO-CARD-3')).idTagInfo.status).not.toBe(
        'Accepted',
      );
    },
  );

  // Samples are spread over half an hour: the pricing engine flags energy no 7.4 kW plug could deliver.
  test(
    'a card session starts, meters, stops and is priced; a repeated meter value changes nothing',
    { tag: ['@module-4', '@module-5'] },
    async () => {
      test.setTimeout(120_000);
      charger = await new Charger16(DemoUsers.RIVERSIDE_SECOND_CHARGER).boot();
      await charger.messages.status(1, 'Preparing');
      const started = await charger.messages.startTransaction(
        1,
        'DEMO-CARD-1',
        1000,
        Charger16.minutesAgo(30),
      );
      expect(started.idTagInfo.status).toBe('Accepted');
      await charger.messages.status(1, 'Charging');
      await charger.messages.meterValuesAt(1, started.transactionId, {
        energyWh: 2500,
        powerW: 6000,
        at: Charger16.minutesAgo(15),
      });
      await charger.messages.meterValuesAt(1, started.transactionId, {
        energyWh: 2500,
        powerW: 6000,
        at: Charger16.minutesAgo(15),
      });
      await expect
        .poll(async () => (await Charger16.session(started.transactionId)).status)
        .toBe('charging');
      await expect
        .poll(async () => (await Charger16.session(started.transactionId)).energy_wh)
        .toBe('1500');
      await charger.messages.stopTransaction(started.transactionId, 4000, { reason: 'Local' });
      await charger.messages.status(1, 'Finishing');
      await charger.messages.status(1, 'Available');
      await expect
        .poll(async () => (await Charger16.session(started.transactionId)).status, {
          timeout: 60_000,
        })
        .toBe('completed');
      expect((await Charger16.session(started.transactionId)).energy_wh).toBe('3000');
    },
  );

  test(
    'meter values queued while offline are accepted when the charger reconnects',
    { tag: ['@module-4'] },
    async () => {
      test.setTimeout(120_000);
      charger = await new Charger16(DemoUsers.DEPOT_CHARGER).boot();
      const started = await charger.messages.startTransaction(
        1,
        'DEMO-CARD-1',
        0,
        Charger16.minutesAgo(10),
      );
      await charger.socket.close();
      charger = await new Charger16(DemoUsers.DEPOT_CHARGER).boot();
      await charger.messages.meterValuesAt(1, started.transactionId, {
        energyWh: 500,
        at: Charger16.minutesAgo(4),
      });
      await charger.messages.meterValues(1, started.transactionId, 1000);
      await expect
        .poll(async () => (await Charger16.session(started.transactionId)).energy_wh)
        .toBe('1000');
      await charger.messages.stopTransaction(started.transactionId, 1000, { reason: 'Local' });
      await charger.messages.status(1, 'Available');
      await expect
        .poll(async () => (await Charger16.session(started.transactionId)).status, {
          timeout: 60_000,
        })
        .toBe('completed');
      expect((await Charger16.session(started.transactionId)).energy_wh).toBe('1000');
    },
  );

  test(
    'energy no plug could deliver is flagged for review and not billed',
    { tag: ['@module-5'] },
    async () => {
      test.setTimeout(120_000);
      charger = await new Charger16(DemoUsers.DEPOT_CHARGER).boot();
      const started = await charger.messages.startTransaction(1, 'DEMO-CARD-1', 0);
      await charger.messages.stopTransaction(started.transactionId, 50_000, { reason: 'Local' });
      await charger.messages.status(1, 'Available');
      await expect
        .poll(async () => (await Charger16.session(started.transactionId)).status, {
          timeout: 60_000,
        })
        .toBe('completed');
      const flags = await Database.one<{ review_flags: string[] }>(
        'select review_flags from charging_sessions where ocpp_transaction_id = $1',
        [String(started.transactionId)],
      );
      expect(flags?.review_flags).toContain('implausible_jump');
    },
  );

  test(
    'at a site with a power limit, a starting session gets a charging profile',
    { tag: ['@module-17'] },
    async () => {
      charger = await new Charger16(DemoUsers.RIVERSIDE_CHARGER).boot();
      await charger.messages.status(1, 'Preparing');
      const started = await charger.messages.startTransaction(1, 'DEMO-CARD-1', 0);
      await charger.messages.status(1, 'Charging');
      await expect.poll(() => charger.profiles.length, { timeout: 30_000 }).toBeGreaterThan(0);
      expect(JSON.stringify(charger.profiles[0])).toContain('chargingSchedule');
      await charger.messages.stopTransaction(started.transactionId, 100, { reason: 'Local' });
      await charger.messages.status(1, 'Available');
    },
  );
});
