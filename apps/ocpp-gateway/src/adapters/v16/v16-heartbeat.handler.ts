import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ChargerConnection } from '../../connection/charger-connection';
import { GatewayChargersRepository } from '../../storage/gateway-chargers.repository';
import { ActionHandler, HandlerResult } from '../action-handler';

/** Heartbeat: a sign of life and the charger's way to sync its clock. */
@Injectable()
export class V16HeartbeatHandler implements ActionHandler {
  readonly action = 'Heartbeat';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly chargers: GatewayChargersRepository,
  ) {}

  async handle(connection: ChargerConnection): Promise<HandlerResult> {
    await this.transactionRunner.run(DatabaseSession.forTenant(connection.charger.tenantId), (tx) =>
      this.chargers.touch(tx, connection.charger.id, true),
    );
    return { reply: { currentTime: new Date().toISOString() } };
  }
}
