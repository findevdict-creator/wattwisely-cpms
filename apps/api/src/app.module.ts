import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AuditModule } from './common/audit/audit.module';
import { AuthModule } from './common/auth/auth.module';
import { DatabaseModule } from './common/database/database.module';
import { MailModule } from './common/mail/mail.module';
import { AssetsModule } from './modules/assets/assets.module';
import { AuditLogModule } from './modules/audit-log/audit-log.module';
import { HealthModule } from './modules/health/health.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { MeModule } from './modules/me/me.module';
import { RolesModule } from './modules/roles/roles.module';
import { TeamModule } from './modules/team/team.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';

/** Wires every module together. Each new domain module is added to this list. */
@Module({
  imports: [
    ConfigModule,
    DatabaseModule,
    MailModule,
    AuditModule,
    AuthModule,
    HealthModule,
    MeModule,
    TenancyModule,
    RolesModule,
    TeamModule,
    InvitationsModule,
    AuditLogModule,
    AssetsModule,
  ],
})
export class AppModule {}
