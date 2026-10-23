import { LoadOptions } from '../cli/load-options';
import { ConnectionTally } from './connection-tally';
import { LatencyStats } from './latency-stats';
import { LoadCharger } from './load-charger';
import { LoadReport } from './load-report';

/** Prints one line of output. */
export type LinePrinter = (line: string) => void;

/**
 * A whole load test: connects the chargers evenly over the ramp, holds the load for the
 * duration, prints progress every 10 seconds, then stops every charger and reports.
 */
export class LoadRun {
  static readonly PROGRESS_MS = 10_000;

  readonly stats = new LatencyStats();
  readonly connections = new ConnectionTally();
  private readonly chargers: LoadCharger[] = [];
  private wake: (() => void) | null = null;
  private isStopped = false;

  constructor(
    private readonly options: LoadOptions,
    private readonly print: LinePrinter,
  ) {}

  async run(): Promise<LoadReport> {
    const startedAt = performance.now();
    const { count, url, rampS, durationS } = this.options;
    this.print(`Connecting ${count} charger(s) to ${url} over ${rampS} s`);
    const progress = setInterval(() => this.progress(), LoadRun.PROGRESS_MS);
    await this.rampUp();
    if (!this.isStopped) {
      this.print(`Holding the load for ${durationS} s`);
      await this.pause(durationS * 1_000);
    }
    clearInterval(progress);
    this.print('Stopping the chargers');
    await Promise.all(this.chargers.map((charger) => charger.stop()));
    const report = new LoadReport(
      this.options,
      this.stats,
      this.connections,
      (performance.now() - startedAt) / 1_000,
    );
    report.lines().forEach((line) => this.print(line));
    return report;
  }

  /** Ends the run early (Ctrl+C); the report still comes. */
  stop(): void {
    this.isStopped = true;
    this.wake?.();
  }

  private async rampUp(): Promise<void> {
    const { count, rampS, prefix } = this.options;
    const gapMs = (rampS * 1_000) / count;
    const starts: Promise<boolean>[] = [];
    for (let n = 1; n <= count && !this.isStopped; n += 1) {
      const charger = new LoadCharger(LoadOptions.identity(prefix, n), {
        options: this.options,
        stats: this.stats,
        connections: this.connections,
      });
      this.chargers.push(charger);
      starts.push(charger.start());
      await this.pause(gapMs);
    }
    await Promise.all(starts);
  }

  /** Waits, unless stop() is called first. */
  private pause(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.wake = null;
        resolve();
      }, ms);
      this.wake = () => {
        clearTimeout(timer);
        this.wake = null;
        resolve();
      };
    });
  }

  private progress(): void {
    const overall = this.stats.overall();
    this.print(
      `  ${this.connections.opened}/${this.options.count} connected, ${overall.count} calls, ` +
        `${overall.failed} failed, p95 ${Math.round(overall.p95)} ms`,
    );
  }
}
