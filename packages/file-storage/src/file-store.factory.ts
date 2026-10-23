import { DatabaseOnlyStore } from './database-only.store';
import { FileStore } from './file-store';
import { S3FileStore } from './s3-file.store';
import { S3Settings } from './s3-settings';

/** Picks the store the settings describe: S3 when an endpoint is set, Postgres only otherwise. */
export class FileStoreFactory {
  static create(settings: S3Settings): FileStore {
    return settings.s3Endpoint.length > 0 ? new S3FileStore(settings) : new DatabaseOnlyStore();
  }
}
