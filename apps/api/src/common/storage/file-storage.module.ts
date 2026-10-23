import { Global, Module } from '@nestjs/common';
import { FileStore, FileStoreFactory, S3SettingsReader } from '@wattwisely/file-storage';

/**
 * Object storage for the API (module 12): it reads the export files the worker put there.
 * The same S3_* settings as the worker; with S3_ENDPOINT empty, files stay in Postgres.
 */
@Global()
@Module({
  providers: [
    {
      provide: FileStore,
      useFactory: () => FileStoreFactory.create(S3SettingsReader.read(process.env)),
    },
  ],
  exports: [FileStore],
})
export class FileStorageModule {}
