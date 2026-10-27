import { FileStore } from './file-store';

/**
 * No object storage set up (tests, a laptop without SeaweedFS): every caller keeps its
 * bytes in Postgres, as before module 12, so nothing ever reaches these methods.
 */
export class DatabaseOnlyStore extends FileStore {
  readonly isEnabled = false;

  async prepare(): Promise<void> {
    // Nothing to prepare.
  }

  put(key: string): Promise<void> {
    return Promise.reject(new Error(`No object storage is set up for ${key}.`));
  }

  get(key: string): Promise<Buffer> {
    return Promise.reject(new Error(`No object storage is set up for ${key}.`));
  }

  async remove(): Promise<void> {
    // Nothing was stored, so nothing to remove.
  }
}
