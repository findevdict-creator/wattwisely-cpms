import { DatabaseClient, DatabaseSession, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { TestData, TestDatabase, TestTariffs } from '@wattwisely/db/testing';
import { SessionStore } from '../store/session-store';
import { SessionFinaliser } from './session-finaliser';

/** The design's worked example, stored the way the gateway stores a session. */
(TestDatabase.isConfigured() ? describe : describe.skip)('SessionFinaliser', () => {
  let database: TestDatabase;
  let data: TestData;
  let client: DatabaseClient;
  let runner: TransactionRunner;
  let tenantId: string;
  let siteId: string;
  let chargerId: string;
  let connectorId: string;
  const finaliser = new SessionFinaliser();
  const sessions = new SessionStore();
  const now = new Date('2026-03-10T18:30:00Z');

  beforeAll(async () => {
    database = await TestDatabase.create();
    data = new TestData(database);
    tenantId = await data.tenant('acme-charging');
    siteId = await data.site(tenantId, 'Riverside');
    chargerId = await data.charger(tenantId, siteId, 'WW-FINALISE');
    connectorId = UuidV7.create();
    await data.sql(
      `insert into connectors (id, tenant_id, charger_id, ocpp_connector_id, label, max_power_kw)
       values ($1, $2, $3, 1, 'A', 50)`,
      [connectorId, tenantId, chargerId],
    );
    client = new DatabaseClient(database.urlFor('wattwisely_app'), 2);
    runner = new TransactionRunner(client);
  });

  afterAll(async () => {
    await client?.close();
    await database?.drop();
  });

  /** A stopped session: 16:30 to 17:30 with a reading at 17:00, unplugged at the given time. */
  const stoppedSession = async (options: { versionId: string | null; isStopKnown?: boolean }) => {
    const id = UuidV7.create();
    const isStopKnown = options.isStopKnown ?? true;
    await data.sql(
      `insert into charging_sessions (id, tenant_id, site_id, charger_id, connector_id, ocpp_transaction_id,
         id_tag, status, time_zone, started_at, ended_at, unplugged_at, meter_start_wh, meter_stop_wh,
         energy_wh, tariff_version_id, currency)
       values ($1, $2, $3, $4, $5, nextval('ocpp_transaction_id_seq'), 'TAG', 'stopping', 'Europe/London',
         '2026-03-10T16:30:00Z', $6, '2026-03-10T17:55:00Z', 100000, $7, 22000, $8, $9)`,
      [
        id,
        tenantId,
        siteId,
        chargerId,
        connectorId,
        isStopKnown ? '2026-03-10T17:30:00Z' : null,
        isStopKnown ? 122000 : null,
        options.versionId,
        options.versionId ? 'GBP' : null,
      ],
    );
    await data.sql(
      `insert into session_state_changes (id, tenant_id, session_id, from_status, to_status, event, occurred_at)
       values ($1, $3, $4, null, 'charging', 'transaction_started', '2026-03-10T16:30:00Z'),
              ($2, $3, $4, 'charging', 'stopping', 'transaction_ended', '2026-03-10T17:30:00Z')`,
      [UuidV7.create(), UuidV7.create(), tenantId, id],
    );
    if (isStopKnown) {
      await data.sql(
        `insert into meter_values (id, tenant_id, charger_id, session_id, measured_at, energy_wh, samples)
         values ($1, $2, $3, $4, '2026-03-10T17:00:00Z', 110000, '[]')`,
        [UuidV7.create(), tenantId, chargerId, id],
      );
    }
    return id;
  };

  const finalise = (id: string) =>
    runner.run(DatabaseSession.forTenant(tenantId), async (tx) => {
      const session = await sessions.findForUpdate(tx, id);
      return session ? finaliser.finalise(tx, session, now) : null;
    });

  it('prices the worked example at 8.80 with 1.47 tax and completes the session', async () => {
    const { versionId } = await new TestTariffs(data).create(tenantId, 'Standard');
    const id = await stoppedSession({ versionId });

    expect(await finalise(id)).toBe('completed');

    const { rows: totals } = await data.sql(
      `select status, net_amount::int, tax_amount::int, gross_amount::int, energy_wh::int,
         pricing_engine_version, priced_at is not null as is_priced, closed_at is not null as is_closed
       from charging_sessions where id = $1`,
      [id],
    );
    expect(totals[0]).toEqual({
      status: 'completed',
      net_amount: 733,
      tax_amount: 147,
      gross_amount: 880,
      energy_wh: 22000,
      pricing_engine_version: '1.0.0',
      is_priced: true,
      is_closed: true,
    });
    const { rows: lines } = await data.sql(
      `select position, kind, band_name, quantity::float, gross::int from session_line_items
       where session_id = $1 order by position`,
      [id],
    );
    expect(lines).toEqual([
      { position: 1, kind: 'energy', band_name: 'Off-peak', quantity: 10000, gross: 300 },
      { position: 2, kind: 'energy', band_name: 'Peak', quantity: 12000, gross: 480 },
      { position: 3, kind: 'idle', band_name: 'Peak', quantity: 10, gross: 100 },
    ]);
  });

  it('does nothing the second time', async () => {
    const { versionId } = await new TestTariffs(data).create(tenantId, 'Twice');
    const id = await stoppedSession({ versionId });

    expect(await finalise(id)).toBe('completed');
    expect(await finalise(id)).toBeNull();

    const { rows } = await data.sql(
      `select count(*)::int as lines from session_line_items where session_id = $1`,
      [id],
    );
    expect(rows[0].lines).toBe(3);
  });

  it('completes a session on a site without a tariff with no price, flagged', async () => {
    const id = await stoppedSession({ versionId: null });

    expect(await finalise(id)).toBe('completed');

    const { rows } = await data.sql(
      'select gross_amount, review_flags from charging_sessions where id = $1',
      [id],
    );
    expect(rows[0]).toEqual({ gross_amount: null, review_flags: ['no_tariff'] });
  });

  it('fails a session with no stop data and no reading to fall back on', async () => {
    const { versionId } = await new TestTariffs(data).create(tenantId, 'Missing stop');
    const id = await stoppedSession({ versionId, isStopKnown: false });

    expect(await finalise(id)).toBe('failed');

    const { rows } = await data.sql(
      'select status, failure_reason from charging_sessions where id = $1',
      [id],
    );
    expect(rows[0]).toEqual({ status: 'failed', failure_reason: 'no_valid_stop_data' });
  });
});
