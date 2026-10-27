/** One message type's numbers in the report. Times in milliseconds. */
export interface ActionSummary {
  action: string;
  count: number;
  failed: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

/**
 * Every call's answer time, by OCPP action, and the calls that failed (a CALLERROR, no
 * answer in time, or a closed socket). Percentiles use the nearest-rank method.
 */
export class LatencyStats {
  static readonly OVERALL = 'all';

  private readonly times = new Map<string, number[]>();
  private readonly failures = new Map<string, number>();

  static percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) {
      return 0;
    }
    const rank = Math.ceil((p / 100) * sorted.length);
    return sorted[Math.min(sorted.length, Math.max(rank, 1)) - 1];
  }

  record(action: string, ms: number): void {
    const list = this.times.get(action) ?? [];
    list.push(ms);
    this.times.set(action, list);
  }

  fail(action: string): void {
    this.failures.set(action, (this.failures.get(action) ?? 0) + 1);
  }

  get callCount(): number {
    return this.summarise(LatencyStats.OVERALL, this.all()).count;
  }

  /** One line per action, busiest first, then the overall line. */
  summary(): ActionSummary[] {
    const actions = new Set([...this.times.keys(), ...this.failures.keys()]);
    const lines = [...actions].map((action) =>
      this.summarise(action, this.times.get(action) ?? [], this.failures.get(action) ?? 0),
    );
    lines.sort((a, b) => b.count - a.count || a.action.localeCompare(b.action));
    return [...lines, this.overall()];
  }

  overall(): ActionSummary {
    const failed = [...this.failures.values()].reduce((sum, n) => sum + n, 0);
    return this.summarise(LatencyStats.OVERALL, this.all(), failed);
  }

  private all(): number[] {
    return [...this.times.values()].flat();
  }

  private summarise(action: string, times: number[], failed = 0): ActionSummary {
    const sorted = [...times].sort((a, b) => a - b);
    return {
      action,
      count: sorted.length + failed,
      failed,
      p50: LatencyStats.percentile(sorted, 50),
      p95: LatencyStats.percentile(sorted, 95),
      p99: LatencyStats.percentile(sorted, 99),
      max: sorted.length ? sorted[sorted.length - 1] : 0,
    };
  }
}
