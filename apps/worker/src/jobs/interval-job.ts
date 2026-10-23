import { Inject, Logger, OnApplicationBootstrap, OnModuleDestroy, Optional } from '@nestjs/common';
import { JobMetrics } from '../metrics/job-metrics';

/**
 * A job the worker runs on a timer. A run never overlaps the previous one, and an error
 * is logged without stopping the timer. Every run is counted and timed for the monitoring
 * (module 12). Tests call `runOnce` directly.
 */
export abstract class IntervalJob implements OnApplicationBootstrap, OnModuleDestroy {
  protected readonly logger = new Logger(this.constructor.name);
  @Optional()
  @Inject(JobMetrics)
  private readonly metrics?: JobMetrics;
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  /** How many items the run changed (sessions, e-mails, rows). */
  abstract runOnce(now: Date): Promise<number>;

  protected abstract intervalMs(): number;

  onApplicationBootstrap(): void {
    this.timer = setInterval(() => void this.tick(), this.intervalMs());
    this.timer.unref();
    this.metrics?.started(this.constructor.name, this.intervalMs() / 1000);
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
    const startedAt = performance.now();
    try {
      const changed = await this.runOnce(new Date());
      this.record(startedAt, true);
      if (changed > 0) {
        this.logger.log(`${changed} item(s) handled`);
      }
    } catch (error) {
      this.record(startedAt, false);
      this.logger.error(`Run failed: ${(error as Error).message}`);
    } finally {
      this.isRunning = false;
    }
  }

  private record(startedAt: number, isOk: boolean): void {
    this.metrics?.record(this.constructor.name, (performance.now() - startedAt) / 1000, isOk);
  }
}
