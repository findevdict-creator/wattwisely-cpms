import { FileStore } from './file-store';

/** Object storage in memory, for tests that check what was written and removed. */
export class MemoryFileStore extends FileStore {
  readonly isEnabled = true;
  readonly files = new Map<string, { body: Buffer; contentType: string }>();
  isFailing = false;

  async prepare(): Promise<void> {
    // Nothing to prepare.
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    if (this.isFailing) {
      throw new Error('Object storage is down');
    }
    this.files.set(key, { body: Buffer.from(body), contentType });
  }

  async get(key: string): Promise<Buffer> {
    const file = this.files.get(key);
    if (!file) {
      throw new Error(`No such key: ${key}`);
    }
    return file.body;
  }

  async remove(key: string): Promise<void> {
    this.files.delete(key);
  }
}
