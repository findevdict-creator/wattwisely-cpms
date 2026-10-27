import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { SessionRow } from '@wattwisely/session-engine';
import { TagDecision, TagPolicy } from '../../commands/tag-policy';
import { ChargerConnection } from '../../connection/charger-connection';
import { SessionOpener } from '../../sessions/session-opener';
import { GatewayRepositories } from '../../storage/gateway-repositories';
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
    private readonly opener: SessionOpener,
    private readonly tags: TagPolicy,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const start = payload as StartTransactionRequest;
    const charger = connection.charger;
    const { session, status } = await this.transactionRunner.run(
      DatabaseSession.forTenant(charger.tenantId),
      async (tx) => {
        await this.store.chargers.touch(tx, charger.id);
        const decision = await this.tags.start(tx, charger.id, start.idTag);
        const connector = await this.store.connectors.findOrCreate(tx, charger, start.connectorId);
        const existing = await this.store.sessions.findOnConnector(tx, connector.id);
        if (existing && V16StartTransactionHandler.isSame(existing, start)) {
          return { session: existing, status: decision.status };
        }
        const opened = await this.open(tx, connection, {
          connectorId: connector.id,
          start,
          decision,
        });
        return { session: opened, status: decision.status };
      },
    );
    return { reply: { transactionId: session.ocppTransactionId ?? 0, idTagInfo: { status } } };
  }

  /** The session carries the driver and card behind the tag, when it was a registered card (module 13). */
  private async open(
    tx: Transaction,
    connection: ChargerConnection,
    opening: {
      connectorId: string;
      start: StartTransactionRequest;
      decision: TagDecision & { commandId: string | null };
    },
  ): Promise<SessionRow> {
    const charger = connection.charger;
    const { connectorId, start, decision } = opening;
    return this.opener.open(tx, charger, {
      tenantId: charger.tenantId,
      chargerId: charger.id,
      connectorId,
      idTag: start.idTag,
      driverId: decision.driverId,
      rfidCardId: decision.cardId,
      startSource: decision.startSource,
      paymentRule: decision.paymentRule,
      isPaid: decision.paymentRule?.outcome === 'pay',
      startedAt: new Date(start.timestamp),
      meterStartWh: start.meterStart,
      commandId: decision.commandId,
    });
  }

  private static isSame(session: SessionRow, start: StartTransactionRequest): boolean {
    return (
      session.idTag === start.idTag &&
      session.startedAt.getTime() === new Date(start.timestamp).getTime()
    );
  }
}
