import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { TagPolicy } from '../../commands/tag-policy';
import { ChargerConnection } from '../../connection/charger-connection';
import { GatewayChargersRepository } from '../../storage/gateway-chargers.repository';
import { ActionHandler, HandlerResult } from '../action-handler';
import { AuthorizeRequest201 } from './v201-messages';

/**
 * Authorize (2.0.1): the station asks whether an idToken may charge. The token's text is
 * what 1.6 called the idTag, so the same tag policy answers, inside the charger's tenant;
 * the five verdicts it gives are 2.0.1 words too.
 */
@Injectable()
export class V201AuthorizeHandler implements ActionHandler {
  readonly action = 'Authorize';

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly chargers: GatewayChargersRepository,
    private readonly tags: TagPolicy,
  ) {}

  async handle(connection: ChargerConnection, payload: unknown): Promise<HandlerResult> {
    const { idToken } = payload as AuthorizeRequest201;
    const charger = connection.charger;
    const { status } = await this.transactionRunner.run(
      DatabaseSession.forTenant(charger.tenantId),
      async (tx) => {
        await this.chargers.touch(tx, charger.id);
        return this.tags.decide(tx, charger.id, idToken.idToken);
      },
    );
    return { reply: { idTokenInfo: { status } } };
  }
}
