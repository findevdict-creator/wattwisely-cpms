import { Global, Module } from '@nestjs/common';
import { DatabaseClient } from './database.client';
import { TransactionRunner } from './transaction-runner';

/** Makes the connection pool and TransactionRunner available to every module. */
@Global()
@Module({
  providers: [DatabaseClient, TransactionRunner],
  exports: [DatabaseClient, TransactionRunner],
})
export class DatabaseModule {}
