import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { FileStore } from '@wattwisely/file-storage';

/**
 * Creates the bucket when the worker starts. A store that cannot be reached is logged and
 * not fatal: the other jobs keep running, and exports fail with a message until it is back.
 */
@Injectable()
export class FileStorePreparer implements OnApplicationBootstrap {
  private readonly logger = new Logger(FileStorePreparer.name);

  constructor(private readonly store: FileStore) {}

  async onApplicationBootstrap(): Promise<void> {
    if (!this.store.isEnabled) {
      this.logger.log('No object storage set up (S3_ENDPOINT): export files stay in Postgres');
      return;
    }
    try {
      await this.store.prepare();
    } catch (error) {
      this.logger.error(`Object storage is not reachable: ${(error as Error).message}`);
    }
  }
}
