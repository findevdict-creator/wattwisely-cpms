import { Global, Module } from '@nestjs/common';
import { ApiConfig } from './api.config';
import { ApiConfigLoader } from './api-config.loader';

/** Makes ApiConfig injectable everywhere. It is loaded once, when the API starts. */
@Global()
@Module({
  providers: [{ provide: ApiConfig, useFactory: () => new ApiConfigLoader().load(process.env) }],
  exports: [ApiConfig],
})
export class ConfigModule {}
