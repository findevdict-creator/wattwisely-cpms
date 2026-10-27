import { Module } from '@nestjs/common';
import { AddonsRepository } from './addons.repository';
import { AddonsService } from './addons.service';
import { AdminAddonsController } from './admin-addons.controller';
import { AdminModulesController } from './admin-modules.controller';
import { AdminPlansController } from './admin-plans.controller';
import { PlansRepository } from './plans.repository';
import { PlansService } from './plans.service';

/**
 * The catalogue (module 9): plans, add-on prices and the module registry. The admin console
 * edits it; the subscription and admin modules read it to describe a tenant's plan.
 */
@Module({
  controllers: [AdminPlansController, AdminAddonsController, AdminModulesController],
  providers: [PlansRepository, AddonsRepository, PlansService, AddonsService],
  exports: [PlansRepository, AddonsRepository, PlansService],
})
export class PlansModule {}
