import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ChargerConnection } from '../../connection/charger-connection';
import { GatewayRepositories } from '../../storage/gateway-repositories';
import { ActionHandler, HandlerResult } from '../action-handler';

/**
 * MeterValues (2.0.1) carries readings outside a transaction: the EVSE's clock meter
 * while nothing charges. Readings of a running charge come inside TransactionEvent, so
 * these stay in the message log only, as 1.6's readings outside a session do.
 */
@Injectable()
export class V201MeterValuesHandler implements ActionHandler {
  readonly action = 'MeterValues';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly store: GatewayRepositories,
  ) {}

  async handle(connection: ChargerConnection): Promise<HandlerResult> {
    await this.transactionRunner.run(DatabaseSession.forTenant(connection.charger.tenantId), (tx) =>
      this.store.chargers.touch(tx, connection.charger.id),
    );
    return { reply: {} };
  }
}
