import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { ChargerConnection } from '../../connection/charger-connection';
import { ChargerEventPublisher } from '../../events/charger-event.publisher';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { SessionRecord } from '../../storage/sessions.repository';
import { ActionHandler, HandlerResult } from '../action-handler';
import { V16MeterReader } from './v16-meter-reader';
import { MeterValuesRequest } from './v16-messages';

/**
 * MeterValues: readings during a charge. They are stored against the running session
 * (named by transactionId, or found on the connector) and move its energy total; the
 * live stream gets the new total. Readings outside a session stay in the message log only.
 */
@Injectable()
export class V16MeterValuesHandler implements ActionHandler {
  readonly action = 'MeterValues';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly store: GatewayRepositories,
    private readonly publisher: ChargerEventPublisher,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const request = payload as MeterValuesRequest;
    const charger = connection.charger;
    await this.transactionRunner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) => {
      await this.store.chargers.touch(tx, charger.id);
      const session = await this.findSession(tx, connection, request);
      if (session?.status === 'charging') {
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
    return connector ? this.store.sessions.findActiveOnConnector(tx, connector.id) : null;
  }

  private async record(
    tx: Transaction,
    connection: ChargerConnection,
    session: SessionRecord,
    request: MeterValuesRequest,
  ): Promise<void> {
    const charger = connection.charger;
    const readings = V16MeterReader.read(request.meterValue);
    await this.store.meterValues.insertMany(
      tx,
      { id: session.id, tenantId: charger.tenantId, chargerId: charger.id },
      readings,
    );
    const latestWh = V16MeterReader.latestEnergyWh(readings);
    const energyWh =
      latestWh === null
        ? session.energyWh
        : await this.store.sessions.updateEnergy(tx, session, latestWh);
    await this.publisher.publish(tx, charger, 'session.updated', {
      session_id: session.id,
      connector_id: session.connectorId,
      status: 'charging',
      energy_wh: energyWh,
      power_w: readings[readings.length - 1]?.powerW ?? null,
    });
  }
}
