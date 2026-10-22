import { Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';

/**
 * A job the worker runs on a timer. A run never overlaps the previous one, and an error
 * is logged without stopping the timer. Tests call `runOnce` directly.
 */
export abstract class IntervalJob implements OnApplicationBootstrap, OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  /** How many sessions the run changed. */
  abstract runOnce(now: Date): Promise<number>;

  protected abstract intervalMs(): number;

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.tick(), this.intervalMs());
    this.timer.unref();
  }

  onModuleDestroy(): void {
    if (this.timer) {
      clearInterval(this.timer);
    }
  }

  private async tick(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    this.isRunning = true;
    try {
      const changed = await this.runOnce(new Date());
      if (changed > 0) {
        this.logger.log(`${changed} session(s) updated`);
      }
    } catch (error) {
      this.logger.error(`Run failed: ${(error as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }
}
