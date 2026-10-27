import { Module } from '@nestjs/common';
import { BrandingModule } from '../branding/branding.module';
import { AdminManagedServiceController } from './admin/admin-managed-service.controller';
import { AdminManagedServiceService } from './admin/admin-managed-service.service';
import { ManagedOperatorAssigner } from './admin/managed-operator.assigner';
import { ManagedOperatorsController } from './admin/managed-operators.controller';
import { ManagedOperatorsService } from './admin/managed-operators.service';
import { ManagedTenantLookup } from './admin/managed-tenant.lookup';
import { ManagedServiceMailer } from './mail/managed-service.mailer';
import { ManagedServiceNotifier } from './mail/managed-service.notifier';
import { OwnerContactsRepository } from './mail/owner-contacts.repository';
import { ManagedOperatorsRepository } from './managed-operators.repository';
import { ManagedServiceDescriber } from './managed-service.describer';
import { ManagedServiceLookup } from './managed-service.lookup';
import { ManagedServiceWriter } from './managed-service.writer';
import { ManagedServicesRepository } from './managed-services.repository';
import { ServiceReportRepository } from './report/service-report.repository';
import { ServiceReportService } from './report/service-report.service';
import { ManagedServiceController } from './tenant/managed-service.controller';
import { ManagedServiceService } from './tenant/managed-service.service';
import { ManagedTenantTransaction } from './tenant/managed-tenant.transaction';
import { OwnOwnerChecker } from './tenant/own-owner.checker';

/**
 * Managed tenants (module 10): the service agreement between Wattwisely and a tenant, the
 * staff working in it as Managed operators, and the monthly service report. Exports what
 * the tariffs module (approval rule, Owner e-mails), the me module (the badge) and the
 * admin module (staff leaving) need.
 */
@Module({
  imports: [BrandingModule],
  controllers: [
    ManagedServiceController,
    AdminManagedServiceController,
    ManagedOperatorsController,
  ],
  providers: [
    ManagedServicesRepository,
    ManagedOperatorsRepository,
    ManagedServiceDescriber,
    ManagedServiceLookup,
    OwnerContactsRepository,
    ManagedServiceMailer,
    ManagedServiceNotifier,
    OwnOwnerChecker,
    ManagedServiceWriter,
    ManagedTenantTransaction,
    ManagedServiceService,
    ManagedTenantLookup,
    ManagedOperatorAssigner,
    ManagedOperatorsService,
    AdminManagedServiceService,
    ServiceReportRepository,
    ServiceReportService,
  ],
  exports: [ManagedServiceLookup, ManagedServiceNotifier, ManagedOperatorsService],
})
export class ManagedModule {}
