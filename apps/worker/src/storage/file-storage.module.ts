import { Global, Module } from '@nestjs/common';
import { FileStore, FileStoreFactory, S3SettingsReader } from '@wattwisely/file-storage';
import { ExportFiles } from './export-files';
import { FileStorePreparer } from './file-store.preparer';

/**
 * Object storage for the worker (module 12): SeaweedFS in deploy/, any S3 service on a real
 * server, or nothing (S3_ENDPOINT empty), in which case export files stay in Postgres.
 */
@Global()
@Module({
  providers: [
    {
      provide: FileStore,
      useFactory: () => FileStoreFactory.create(S3SettingsReader.read(process.env)),
    },
    FileStorePreparer,
    ExportFiles,
  ],
  exports: [FileStore, ExportFiles],
})
export class FileStorageModule {}
