import { Module } from '@nestjs/common';
import { ConfigModule } from './config/config.module';
import { AuthModule } from './common/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { MeModule } from './modules/me/me.module';
import { TenancyModule } from './modules/tenancy/tenancy.module';

/** Wires every module together. Each new domain module is added to this list. */
@Module({
  imports: [ConfigModule, AuthModule, HealthModule, MeModule, TenancyModule],
})
export class AppModule {}
