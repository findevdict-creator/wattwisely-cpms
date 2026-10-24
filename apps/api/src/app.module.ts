import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AuditModule } from './common/audit/audit.module';
import { AuthModule } from './common/auth/auth.module';
import { DatabaseModule } from './common/database/database.module';
import { EntitlementsModule } from './common/entitlements/entitlements.module';
import { MailModule } from './common/mail/mail.module';
import { ApiMetricsModule } from './common/metrics/api-metrics.module';
import { FileStorageModule } from './common/storage/file-storage.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { BrandingModule } from './modules/branding/branding.module';
import { AdminModule } from './modules/admin/admin.module';
import { AlertsModule } from './modules/alerts/alerts.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { HealthModule } from './modules/health/health.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { LoadManagementModule } from './modules/load-management/load-management.module';
import { ManagedModule } from './modules/managed/managed.module';
import { MeModule } from './modules/me/me.module';
import { MessagingModule } from './modules/messaging/messaging.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { OcppModule } from './modules/ocpp/ocpp.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { RolesModule } from './modules/roles/roles.module';
import { PlansModule } from './modules/plans/plans.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SubscriptionModule } from './modules/subscription/subscription.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';
import { TeamModule } from './modules/team/team.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';

/** Wires every module together. Each new domain module is added to this list. */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    ApiMetricsModule,
    FileStorageModule,
    MailModule,
    AuditModule,
    EntitlementsModule,
    AuthModule,
    HealthModule,
    MeModule,
    TenancyModule,
    RolesModule,
    TeamModule,
    InvitationsModule,
    AuditLogModule,
    BrandingModule,
    AssetsModule,
    OcppModule,
    TariffsModule,
    SessionsModule,
    PaymentsModule,
    DriversModule,
    PlansModule,
    SubscriptionModule,
    ManagedModule,
    AlertsModule,
    NotificationsModule,
    ReportsModule,
    AdminModule,
    InvoicesModule,
    IntegrationsModule,
    LoadManagementModule,
    MessagingModule,
  ],
})
export class AppModule {}
