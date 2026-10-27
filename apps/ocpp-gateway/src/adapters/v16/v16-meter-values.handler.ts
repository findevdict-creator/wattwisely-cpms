import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { SessionRow, SessionStates } from '@wattwisely/session-engine';
import { ChargerConnection } from '../../connection/charger-connection';
import { IdleRule } from '../../sessions/idle-rule';
import { SessionRecorder } from '../../sessions/session-recorder';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { ActionHandler, HandlerResult } from '../action-handler';
import { MeterReader } from '../meter-reader';
import { MeterValuesRequest } from './v16-messages';

/**
 * MeterValues: readings during a charge. They are stored against the running session
 * (named by transactionId, or found on the connector) and move its energy total; the
 * live stream gets the new total. New energy on an idle session means it is charging
 * again; none for two minutes on a charging session means it has gone idle.
 * Readings outside a session stay in the message log only.
 */
@Injectable()
export class V16MeterValuesHandler implements ActionHandler {
  readonly action = 'MeterValues';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly store: GatewayRepositories,
    private readonly recorder: SessionRecorder,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const request = payload as MeterValuesRequest;
    const charger = connection.charger;
    await this.transactionRunner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) => {
      await this.store.chargers.touch(tx, charger.id);
      const session = await this.findSession(tx, connection, request);
      if (session && SessionStates.isActive(session.status)) {
        await this.record(tx, connection, session, request);
      }
    });
    return { reply: {} };
  }

  private async findSession(
    tx: Transaction,
    connection: ChargerConnection,
    request: MeterValuesRequest,
  ) {
    if (request.transactionId !== undefined) {
      return this.store.sessions.findByTransactionId(
        tx,
        connection.charger.id,
        request.transactionId,
      );
    }
    const connector = await this.store.connectors.findByNumber(
      tx,
      connection.charger.id,
      request.connectorId,
    );
    return connector ? this.store.sessions.findOnConnector(tx, connector.id) : null;
  }

  private async record(
    tx: Transaction,
    connection: ChargerConnection,
    session: SessionRow,
    request: MeterValuesRequest,
  ): Promise<void> {
    const charger = connection.charger;
    const readings = MeterReader.read(request.meterValue);
    await this.store.meterValues.insertMany(
      tx,
      { id: session.id, tenantId: charger.tenantId, chargerId: charger.id },
      readings,
    );
    const latest = MeterReader.latestEnergy(readings);
    if (!latest) {
      await this.recorder.announce(tx, session, {
        status: session.status,
        energyWh: session.energyWh,
        extra: { power_w: readings[readings.length - 1]?.powerW ?? null },
      });
      return;
    }
    const energyWh = await this.store.sessions.updateEnergy(tx, session, latest);
    const status = await this.followEnergy(tx, session, { energyWh, at: latest.at });
    await this.recorder.announce(tx, session, {
      status,
      energyWh,
      extra: { power_w: readings[readings.length - 1]?.powerW ?? null },
    });
  }

  /** Idle when the energy stopped going up for two minutes, charging again when it moves. */
  private async followEnergy(
    tx: Transaction,
    session: SessionRow,
    reading: { energyWh: number; at: Date },
  ) {
    const isIncreased = reading.energyWh > session.energyWh;
    const event = isIncreased
      ? 'energy_resumed'
      : IdleRule.isIdleAt(session, reading.at)
        ? 'energy_stopped'
        : null;
    if (!event) {
      return session.status;
    }
    const moved = await this.recorder.move(tx, session, event, { occurredAt: reading.at });
    return moved ?? session.status;
  }
}
