import { Injectable, Logger } from '@nestjs/common';
import { FileStore } from '@wattwisely/file-storage';

/** Where one export's gzipped CSV ended up: in object storage, or in the row itself. */
export interface StoredExportFile {
  data: Buffer | null;
  storageKey: string | null;
}

/**
 * Keeps, reads and drops the files of report exports (module 12). With object storage the
 * file goes to `exports/<tenant id>/<export id>.csv.gz` and the row only names it; without,
 * the bytes stay in report_exports.data as in module 11.
 */
@Injectable()
export class ExportFiles {
  static readonly CONTENT_TYPE = 'application/gzip';
  private readonly logger = new Logger(ExportFiles.name);

  constructor(private readonly store: FileStore) {}

  static keyFor(tenantId: string, exportId: string): string {
    return `exports/${tenantId}/${exportId}.csv.gz`;
  }

  async keep(tenantId: string, exportId: string, gzipped: Buffer): Promise<StoredExportFile> {
    if (!this.store.isEnabled) {
      return { data: gzipped, storageKey: null };
    }
    const storageKey = ExportFiles.keyFor(tenantId, exportId);
    await this.store.put(storageKey, gzipped, ExportFiles.CONTENT_TYPE);
    return { data: null, storageKey };
  }

  read(file: StoredExportFile): Promise<Buffer | null> {
    if (file.storageKey) {
      return this.store.get(file.storageKey);
    }
    return Promise.resolve(file.data);
  }

  /** Best effort: a file that cannot be removed now is logged, and the row is expired anyway. */
  async discard(storageKeys: string[]): Promise<void> {
    for (const key of storageKeys) {
      try {
        await this.store.remove(key);
      } catch (error) {
        this.logger.warn(`Could not remove ${key}: ${(error as Error).message}`);
      }
    }
  }
}
