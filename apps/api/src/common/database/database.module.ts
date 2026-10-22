import { Global, Module } from '@nestjs/common';
import { DatabaseClient, TransactionRunner } from '@wattwisely/db';
import { ApiConfig } from '../../config/api.config';

/**
 * Makes the connection pool and TransactionRunner (both from packages/db, shared with
 * the OCPP gateway) available to every module. The pool closes when the API stops.
 */
@Global()
@Module({
  providers: [
    {
      provide: DatabaseClient,
      useFactory: (config: ApiConfig) => new DatabaseClient(config.databaseUrl),
      inject: [ApiConfig],
    },
    {
      provide: TransactionRunner,
      useFactory: (client: DatabaseClient) => new TransactionRunner(client),
      inject: [DatabaseClient],
    },
  ],
  exports: [DatabaseClient, TransactionRunner],
})
export class DatabaseModule {
  constructor(private readonly client: DatabaseClient) {}

  async onModuleDestroy(): Promise<void> {
    await this.client.close();
  }
}
