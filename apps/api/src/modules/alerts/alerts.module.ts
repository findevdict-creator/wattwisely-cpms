import { Module } from '@nestjs/common';
import { AlertsController } from './alerts.controller';
import { AlertsRepository } from './alerts.repository';
import { AlertsService } from './alerts.service';
import { AlertRulesController } from './rules/alert-rules.controller';
import { AlertRulesRepository } from './rules/alert-rules.repository';
import { AlertRulesService } from './rules/alert-rules.service';

/** Alerts and their routing for staff (module 11). The worker opens and closes the alerts. */
@Module({
  controllers: [AlertsController, AlertRulesController],
  providers: [AlertsRepository, AlertsService, AlertRulesRepository, AlertRulesService],
})
export class AlertsModule {}
