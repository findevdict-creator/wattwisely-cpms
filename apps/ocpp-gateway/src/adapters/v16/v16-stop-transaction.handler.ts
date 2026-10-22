import { Injectable, Logger } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { ChargerConnection } from '../../connection/charger-connection';
import { ChargerEventPublisher } from '../../events/charger-event.publisher';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { SessionRecord } from '../../storage/sessions.repository';
import { ActionHandler, HandlerResult } from '../action-handler';
import { V16MeterReader } from './v16-meter-reader';
import { StopTransactionRequest } from './v16-messages';

/** StopTransaction: closes the session with its final meter reading and reason. An unknown id is answered anyway. */
@Injectable()
export class V16StopTransactionHandler implements ActionHandler {
  readonly action = 'StopTransaction';

  private readonly logger = new Logger(V16StopTransactionHandler.name);

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly store: GatewayRepositories,
    private readonly publisher: ChargerEventPublisher,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const stop = payload as StopTransactionRequest;
    const charger = connection.charger;
    await this.transactionRunner.run(DatabaseSession.forTenant(charger.tenantId), async (tx) => {
      await this.store.chargers.touch(tx, charger.id);
      const session = await this.store.sessions.findByTransactionId(
        tx,
        charger.id,
        stop.transactionId,
      );
      if (!session) {
        this.logger.warn(`${charger.identity} stopped unknown transaction ${stop.transactionId}`);
        return;
      }
      if (session.status === 'charging') {
        await this.close(tx, connection, session, stop);
      }
    });
    return { reply: stop.idTag ? { idTagInfo: { status: 'Accepted' } } : {} };
  }

  private async close(
    tx: Transaction,
    connection: ChargerConnection,
    session: SessionRecord,
    stop: StopTransactionRequest,
  ): Promise<void> {
    const charger = connection.charger;
    await this.store.sessions.stop(tx, session, {
      endedAt: new Date(stop.timestamp),
      meterStopWh: stop.meterStop,
      stopReason: stop.reason ?? null,
    });
    await this.store.meterValues.insertMany(
      tx,
      { id: session.id, tenantId: charger.tenantId, chargerId: charger.id },
      V16MeterReader.read(stop.transactionData ?? []),
    );
    await this.publisher.publish(tx, charger, 'session.updated', {
      session_id: session.id,
      connector_id: session.connectorId,
      status: 'ended',
      energy_wh: Math.max(0, stop.meterStop - session.meterStartWh),
      stop_reason: stop.reason ?? null,
    });
  }
}
