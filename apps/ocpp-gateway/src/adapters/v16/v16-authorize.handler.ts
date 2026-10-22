import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { TagPolicy } from '../../commands/tag-policy';
import { ChargerConnection } from '../../connection/charger-connection';
import { GatewayChargersRepository } from '../../storage/gateway-chargers.repository';
import { ActionHandler, HandlerResult } from '../action-handler';
import { AuthorizeRequest } from './v16-messages';

/** Authorize: the charger asks whether an idTag may charge. Answered at once from the tag policy. */
@Injectable()
export class V16AuthorizeHandler implements ActionHandler {
  readonly action = 'Authorize';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly chargers: GatewayChargersRepository,
    private readonly tags: TagPolicy,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const { idTag } = payload as AuthorizeRequest;
    await this.transactionRunner.run(DatabaseSession.forTenant(connection.charger.tenantId), (tx) =>
      this.chargers.touch(tx, connection.charger.id),
    );
    return { reply: { idTagInfo: { status: this.tags.decide(connection.charger.id, idTag) } } };
  }
}
