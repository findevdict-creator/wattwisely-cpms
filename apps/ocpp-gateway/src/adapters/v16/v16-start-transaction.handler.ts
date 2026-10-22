import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { TagPolicy } from '../../commands/tag-policy';
import { ChargerConnection } from '../../connection/charger-connection';
import { ChargerEventPublisher } from '../../events/charger-event.publisher';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { SessionRecord } from '../../storage/sessions.repository';
import { ActionHandler, HandlerResult } from '../action-handler';
import { StartTransactionRequest } from './v16-messages';

/**
 * StartTransaction: opens a charging session and hands the charger its transactionId.
 * A resent StartTransaction (same connector, tag and start time) gets the same id back,
 * so an outage never makes two sessions out of one charge.
 */
@Injectable()
export class V16StartTransactionHandler implements ActionHandler {
  readonly action = 'StartTransaction';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly store: GatewayRepositories,
    private readonly publisher: ChargerEventPublisher,
    private readonly tags: TagPolicy,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const start = payload as StartTransactionRequest;
    const charger = connection.charger;
    const { status, commandId } = this.tags.start(charger.id, start.idTag);
    const session = await this.transactionRunner.run(
      DatabaseSession.forTenant(charger.tenantId),
      async (tx) => {
        await this.store.chargers.touch(tx, charger.id);
        const connector = await this.store.connectors.findOrCreate(tx, charger, start.connectorId);
        const existing = await this.store.sessions.findActiveOnConnector(tx, connector.id);
        if (existing && V16StartTransactionHandler.isSame(existing, start)) {
          return existing;
        }
        return this.open(tx, connection, connector.id, { ...start, commandId });
      },
    );
    return { reply: { transactionId: session.ocppTransactionId, idTagInfo: { status } } };
  }

  private async open(
    tx: Transaction,
    connection: ChargerConnection,
    connectorId: string,
    start: StartTransactionRequest & { commandId: string | null },
  ): Promise<SessionRecord> {
    const charger = connection.charger;
    const session = await this.store.sessions.start(tx, {
      tenantId: charger.tenantId,
      chargerId: charger.id,
      connectorId,
      idTag: start.idTag,
      startedAt: new Date(start.timestamp),
      meterStartWh: start.meterStart,
      commandId: start.commandId,
    });
    await this.publisher.publish(tx, charger, 'session.updated', {
      session_id: session.id,
      connector_id: connectorId,
      ocpp_connector_id: start.connectorId,
      status: 'charging',
      energy_wh: 0,
    });
    return session;
  }

  private static isSame(session: SessionRecord, start: StartTransactionRequest): boolean {
    return (
      session.idTag === start.idTag &&
      session.startedAt.getTime() === new Date(start.timestamp).getTime()
    );
  }
}
