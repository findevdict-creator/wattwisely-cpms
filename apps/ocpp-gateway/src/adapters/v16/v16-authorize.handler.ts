import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { TagPolicy } from '../../commands/tag-policy';
import { ChargerConnection } from '../../connection/charger-connection';
import { GatewayChargersRepository } from '../../storage/gateway-chargers.repository';
import { ActionHandler, HandlerResult } from '../action-handler';
import { AuthorizeRequest } from './v16-messages';

/** Authorize: the charger asks whether an idTag may charge. Answered from the tag policy, inside the charger's tenant. */
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
    const charger = connection.charger;
    const { status } = await this.transactionRunner.run(
      DatabaseSession.forTenant(charger.tenantId),
      async (tx) => {
        await this.chargers.touch(tx, charger.id);
        return this.tags.decide(tx, charger.id, idTag);
      },
    );
    return { reply: { idTagInfo: { status } } };
  }
}
