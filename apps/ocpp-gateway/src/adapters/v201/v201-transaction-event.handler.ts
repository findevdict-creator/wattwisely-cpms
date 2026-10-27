import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { ChargerConnection } from '../../connection/charger-connection';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { ActionHandler, HandlerResult } from '../action-handler';
import { IdTokenStatus, TransactionEventRequest201 } from './v201-messages';
import { V201TransactionSteps } from './v201-transaction-steps';

/**
 * TransactionEvent (2.0.1) is what 1.6 spread over StartTransaction, MeterValues,
 * StatusNotification and StopTransaction: one message with an eventType. Every event
 * names the transaction by the id the charger chose and the EVSE it runs on; the
 * session is opened at the first event seen, fed each event's readings and charging
 * state, and closed at Ended. The reply carries the verdict on the event's token when
 * it had one, as the charger expects.
 */
@Injectable()
export class V201TransactionEventHandler implements ActionHandler {
  readonly action = 'TransactionEvent';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly store: GatewayRepositories,
    private readonly steps: V201TransactionSteps,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const event = payload as TransactionEventRequest201;
    const charger = connection.charger;
    const tokenStatus = await this.transactionRunner.run(
      DatabaseSession.forTenant(charger.tenantId),
      async (tx) => {
        await this.store.chargers.touch(tx, charger.id);
        return this.apply(tx, connection, event);
      },
    );
    return { reply: tokenStatus ? { idTokenInfo: { status: tokenStatus } } : {} };
  }

  private async apply(
    tx: Transaction,
    connection: ChargerConnection,
    event: TransactionEventRequest201,
  ): Promise<IdTokenStatus | null> {
    const charger = connection.charger;
    const evseId = event.evse?.id ?? 1;
    const connector = await this.store.connectors.findOrCreate(tx, charger, evseId, evseId);
    const { starter, updater, ender, chargingState } = this.steps;
    const started = await starter.findOrOpen(tx, charger, connector, event);
    const identified = await updater.identify(tx, charger, started.session, event);
    const isEnded = event.eventType === 'Ended';
    if (isEnded) {
      await ender.end(tx, charger, started.session, event);
    } else {
      await updater.record(tx, charger, started.session, event);
    }
    await chargingState.apply(tx, charger, connector, {
      chargingState: event.transactionInfo.chargingState,
      isEnded,
      at: new Date(event.timestamp),
    });
    return started.tokenStatus ?? identified;
  }
}
