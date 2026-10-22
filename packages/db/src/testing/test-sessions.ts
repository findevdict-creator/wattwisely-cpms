import { UuidV7 } from '../client/uuid-v7';
import { TestData } from './test-data';

/** Where a test session happens. */
export interface SessionPlace {
  tenantId: string;
  siteId: string;
  chargerId: string;
  connectorId: string;
}

/** A session as the gateway would have stored it; anything left out is the worked example. */
export interface TestSessionOptions {
  status?: string;
  tariffVersionId?: string | null;
  startedAt?: string;
  endedAt?: string | null;
  unpluggedAt?: string | null;
  meterStartWh?: number;
  meterStopWh?: number | null;
  readings?: { at: string; meterWh: number }[];
  history?: { from: string | null; to: string; event: string; at: string }[];
  lastEventAt?: string;
}

/**
 * Charging sessions for tests, by default the design's worked example: 16:30 to 17:30
 * UTC on 10 March 2026, 10 kWh before 17:00 and 12 kWh after, unplugged at 17:55.
 */
export class TestSessions {
  static readonly WORKED_EXAMPLE: Required<TestSessionOptions> = {
    status: 'stopping',
    tariffVersionId: null,
    startedAt: '2026-03-10T16:30:00Z',
    endedAt: '2026-03-10T17:30:00Z',
    unpluggedAt: '2026-03-10T17:55:00Z',
    meterStartWh: 100_000,
    meterStopWh: 122_000,
    readings: [{ at: '2026-03-10T17:00:00Z', meterWh: 110_000 }],
    history: [
      { from: null, to: 'charging', event: 'transaction_started', at: '2026-03-10T16:30:00Z' },
      { from: 'charging', to: 'stopping', event: 'transaction_ended', at: '2026-03-10T17:30:00Z' },
    ],
    lastEventAt: '2026-03-10T17:55:00Z',
  };

  constructor(private readonly data: TestData) {}

  async create(place: SessionPlace, options: TestSessionOptions = {}): Promise<string> {
    const session = { ...TestSessions.WORKED_EXAMPLE, ...options };
    const id = UuidV7.create();
    await this.data.sql(
      `insert into charging_sessions (id, tenant_id, site_id, charger_id, connector_id, ocpp_transaction_id,
         id_tag, status, time_zone, started_at, ended_at, unplugged_at, meter_start_wh, meter_stop_wh,
         energy_wh, tariff_version_id, currency, last_event_at)
       values ($1, $2, $3, $4, $5, nextval('ocpp_transaction_id_seq'), 'TEST-TAG', $6, 'Europe/London',
         $7, $8, $9, $10, $11, $12, $13, case when $13::uuid is null then null else 'GBP' end, $14)`,
      [
        id,
        place.tenantId,
        place.siteId,
        place.chargerId,
        place.connectorId,
        session.status,
        session.startedAt,
        session.endedAt,
        session.unpluggedAt,
        session.meterStartWh,
        session.meterStopWh,
        Math.max(0, (session.meterStopWh ?? session.meterStartWh) - session.meterStartWh),
        session.tariffVersionId,
        session.lastEventAt,
      ],
    );
    await this.addHistory(place, id, session.history);
    await this.addReadings(place, id, session.readings);
    return id;
  }

  private async addHistory(
    place: SessionPlace,
    id: string,
    history: TestSessionOptions['history'],
  ) {
    for (const change of history ?? []) {
      await this.data.sql(
        `insert into session_state_changes (id, tenant_id, session_id, from_status, to_status, event, occurred_at)
         values ($1, $2, $3, $4, $5, $6, $7)`,
        [UuidV7.create(), place.tenantId, id, change.from, change.to, change.event, change.at],
      );
    }
  }

  private async addReadings(
    place: SessionPlace,
    id: string,
    readings: TestSessionOptions['readings'],
  ) {
    for (const reading of readings ?? []) {
      await this.data.sql(
        `insert into meter_values (id, tenant_id, charger_id, session_id, measured_at, energy_wh, samples)
         values ($1, $2, $3, $4, $5, $6, '[]')`,
        [UuidV7.create(), place.tenantId, place.chargerId, id, reading.at, reading.meterWh],
      );
    }
  }
}
