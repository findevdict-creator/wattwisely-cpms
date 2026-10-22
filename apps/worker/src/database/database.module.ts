import { Global, Module } from '@nestjs/common';
import { DatabaseClient, TransactionRunner } from '@wattwisely/db';
import { WorkerConfig } from '../config/worker.config';

/** The connection pool and TransactionRunner from packages/db, the same building blocks the API uses. */
@Global()
@Module({
  providers: [
    {
      provide: DatabaseClient,
      useFactory: (config: WorkerConfig) => new DatabaseClient(config.databaseUrl),
      inject: [WorkerConfig],
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
