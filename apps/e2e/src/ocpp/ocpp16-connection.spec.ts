import { expect, test } from '@playwright/test';
import { ConnectRefused, SimFrames } from '@wattwisely/charger-sim';
import { Charger16 } from '../support/charger16';
import { Database } from '../support/database';
import { DemoUsers } from '../support/demo-users';

// Module 4 (the OCPP 1.6J gateway) and module 12 (hardening): the connection itself, against
// the running gateway, the way a real charger talks to it.
test.describe('OCPP 1.6J gateway: connecting', () => {
  let charger: Charger16;

  test.afterEach(async () => {
    await charger?.socket.close().catch(() => undefined);
  });

  test(
    'a known charger boots, beats and reports its connectors',
    { tag: ['@module-4'] },
    async () => {
      charger = new Charger16(DemoUsers.RIVERSIDE_CHARGER);
      await charger.socket.connect();
      expect(charger.socket.protocol).toBe('ocpp1.6');
      const boot = await charger.messages.boot();
      expect(boot).toMatchObject({ status: 'Accepted', interval: expect.any(Number) });
      expect(await charger.messages.heartbeat()).toHaveProperty('currentTime');
      await charger.messages.status(1, 'Available');
      await expect
        .poll(
          async () =>
            (
              await Database.one<{ status: string }>(
                `select cn.status from connectors cn join chargers c on c.id = cn.charger_id
         where c.ocpp_identity = $1 order by cn.ocpp_connector_id limit 1`,
                [DemoUsers.RIVERSIDE_CHARGER],
              )
            )?.status,
        )
        .toBe('available');
    },
  );

  test(
    'an identity nobody registered is refused at the handshake',
    { tag: ['@module-4'] },
    async () => {
      charger = new Charger16('WW-NOT-REGISTERED');
      const refusal = await charger.socket.connect().then(
        () => null,
        (error: unknown) => error,
      );
      expect(refusal).toBeInstanceOf(ConnectRefused);
      expect((refusal as ConnectRefused).status).toBeGreaterThanOrEqual(400);
    },
  );

  test('a subprotocol the gateway does not speak is refused', { tag: ['@module-4'] }, async () => {
    charger = new Charger16(DemoUsers.RIVERSIDE_CHARGER, ['ocpp1.2']);
    const outcome = await charger.socket.connect().then(
      () => charger.socket.protocol,
      (error: unknown) => error,
    );
    expect(
      outcome === null ||
        outcome === '' ||
        outcome instanceof ConnectRefused ||
        outcome === undefined,
    ).toBe(true);
  });

  test(
    'a malformed frame gets a CALLERROR, and the connection stays usable',
    { tag: ['@module-4', '@module-12'] },
    async () => {
      charger = await new Charger16(DemoUsers.RIVERSIDE_CHARGER).boot();
      const bad = await charger.socket.sendRawForReply(
        'bad-1',
        SimFrames.call('bad-1', 'StatusNotification', { connectorId: 'one' }),
      );
      expect(bad.kind).toBe('error');
      const unknown = await charger.socket.sendRawForReply(
        'bad-2',
        SimFrames.call('bad-2', 'NoSuchAction', {}),
      );
      expect(unknown).toMatchObject({ kind: 'error', code: 'NotImplemented' });
      expect(await charger.messages.heartbeat()).toHaveProperty('currentTime');
    },
  );

  test(
    'a second connection under an identity already connected is refused with 409',
    { tag: ['@module-4'] },
    async () => {
      charger = await new Charger16(DemoUsers.RIVERSIDE_SECOND_CHARGER).boot();
      const second = new Charger16(DemoUsers.RIVERSIDE_SECOND_CHARGER);
      const refusal = await second.socket.connect().then(
        () => null,
        (error: unknown) => error,
      );
      expect(refusal).toMatchObject({
        status: 409,
        reason: expect.stringContaining('already_connected'),
      });
      expect(await charger.messages.heartbeat()).toHaveProperty('currentTime');
    },
  );
});
