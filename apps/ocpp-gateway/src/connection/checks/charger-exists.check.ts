import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { ChargerIdentity } from '../../storage/charger-identity';
import { GatewayChargersRepository } from '../../storage/gateway-chargers.repository';
import { UpgradeRefusal } from '../upgrade-refusal';
import { UpgradeRequest } from '../upgrade-request';

/**
 * The identity in the URL must belong to a registered charger (check 1). The lookup runs
 * as a charger-identity session, so row-level security shows that one row and nothing else.
 */
@Injectable()
export class ChargerExistsCheck {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly chargers: GatewayChargersRepository,
  ) {}

  async find(request: UpgradeRequest): Promise<ChargerIdentity> {
    const charger = request.identity
      ? await this.transactionRunner.run(
          DatabaseSession.forChargerIdentity(request.identity),
          (tx) => this.chargers.findByIdentity(tx, request.identity),
        )
      : null;
    if (!charger) {
      throw new UpgradeRefusal(404, 'unknown_charger');
    }
    return charger;
  }
}
