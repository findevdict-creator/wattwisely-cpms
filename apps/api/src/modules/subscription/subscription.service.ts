import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { SubscriptionDto } from './dto/subscription.dto';
import { SubscriptionDescriber } from './subscription.describer';

/** The tenant's own view of its plan (Settings, Plan). Changing it is the admin console's job. */
@Injectable()
export class SubscriptionService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly describer: SubscriptionDescriber,
  ) {}

  async get(access: TenantAccess): Promise<SubscriptionDto> {
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.describer.describe(tx, access.tenant.id, false),
    );
  }
}
