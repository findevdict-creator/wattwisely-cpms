import { LoadOptions } from '../cli/load-options';
import { ConnectionTally } from './connection-tally';
import { ActionSummary, LatencyStats } from './latency-stats';

/** The end of a run: answer times by message, how the connections went, and the verdict. */
export class LoadReport {
  readonly overall: ActionSummary;

  constructor(
    private readonly options: LoadOptions,
    private readonly stats: LatencyStats,
    private readonly connections: ConnectionTally,
    private readonly elapsedS: number,
  ) {
    this.overall = stats.overall();
  }

  get errorRate(): number {
    return this.overall.count === 0 ? 1 : this.overall.failed / this.overall.count;
  }

  /** Every charger got in and stayed, the p95 is within --max-p95 and few enough calls failed. */
  get isPassed(): boolean {
    return (
      this.connections.opened === this.options.count &&
      this.connections.dropped === 0 &&
      this.overall.p95 <= this.options.maxP95Ms &&
      this.errorRate <= this.options.maxErrorRate
    );
  }

  lines(): string[] {
    return [
      '',
      `${'Message'.padEnd(20)}${['calls', 'failed', 'p50 ms', 'p95 ms', 'p99 ms', 'max ms'].map((h) => h.padStart(9)).join('')}`,
      ...this.stats.summary().map((line) => this.row(line)),
      '',
      ...this.connectionLines(),
      `Calls per second: ${(this.overall.count / Math.max(this.elapsedS, 0.001)).toFixed(1)} over ${this.elapsedS.toFixed(0)} s`,
      this.verdict(),
    ];
  }

  private row(line: ActionSummary): string {
    const numbers = [line.count, line.failed, line.p50, line.p95, line.p99, line.max];
    return `${line.action.padEnd(20)}${numbers.map((n) => String(Math.round(n)).padStart(9)).join('')}`;
  }

  private connectionLines(): string[] {
    const lines = [`Chargers connected: ${this.connections.opened} of ${this.options.count}`];
    for (const [status, count] of this.connections.refused) {
      lines.push(`  refused with HTTP ${status}: ${count}`);
    }
    for (const [message, count] of this.connections.errors) {
      lines.push(`  ${message}: ${count}`);
    }
    if (this.connections.dropped > 0) {
      lines.push(`  dropped by the server during the run: ${this.connections.dropped}`);
    }
    return lines;
  }

  private verdict(): string {
    const errors = `${(this.errorRate * 100).toFixed(2)}% of calls failed (limit ${this.options.maxErrorRate * 100}%)`;
    const p95 = `p95 ${Math.round(this.overall.p95)} ms (limit ${this.options.maxP95Ms} ms)`;
    return `${this.isPassed ? 'PASSED' : 'FAILED'}: ${p95}, ${errors}`;
  }
}
