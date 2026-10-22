import { Global, Module } from '@nestjs/common';
import { GatewayConfig } from './gateway.config';
import { GatewayConfigLoader } from './gateway-config.loader';

/** Makes GatewayConfig injectable everywhere. It is loaded once, when the gateway starts. */
@Global()
@Module({
  providers: [
    { provide: GatewayConfig, useFactory: () => new GatewayConfigLoader().load(process.env) },
  ],
  exports: [GatewayConfig],
})
export class ConfigModule {}
