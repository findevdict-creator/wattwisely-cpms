import { Global, Module } from '@nestjs/common';
import { WorkerConfig } from './worker.config';
import { WorkerConfigLoader } from './worker-config.loader';

/** Makes WorkerConfig injectable everywhere. It is loaded once, when the worker starts. */
@Global()
@Module({
  providers: [
    { provide: WorkerConfig, useFactory: () => new WorkerConfigLoader().load(process.env) },
  ],
  exports: [WorkerConfig],
})
export class ConfigModule {}
