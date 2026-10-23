import { Module } from '@nestjs/common';
import { PlansModule } from '../plans/plans.module';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionDescriber } from './subscription.describer';
import { SubscriptionService } from './subscription.service';
import { SubscriptionsRepository } from './subscriptions.repository';
import { TenantOverviewRepository } from './tenant-overview.repository';

/** A tenant's plan (module 9): the Plan page, and what the admin console reads and writes per tenant. */
@Module({
  imports: [PlansModule],
  controllers: [SubscriptionController],
  providers: [
    SubscriptionsRepository,
    TenantOverviewRepository,
    SubscriptionDescriber,
    SubscriptionService,
  ],
  exports: [SubscriptionsRepository, TenantOverviewRepository, SubscriptionDescriber],
})
export class SubscriptionModule {}
