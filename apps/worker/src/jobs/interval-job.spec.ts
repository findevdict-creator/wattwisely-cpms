import { MetricsRegistry } from '@wattwisely/observability';
import { JobMetrics } from '../metrics/job-metrics';
import { IntervalJob } from './interval-job';

class CountingJob extends IntervalJob {
  runs = 0;
  isFailing = false;

  constructor(metrics: JobMetrics) {
    super();
    Object.assign(this, { metrics });
  }

  async runOnce(): Promise<number> {
    this.runs += 1;
    if (this.isFailing) {
      throw new Error('database down');
    }
    return 0;
  }

  protected intervalMs(): number {
    return 1_000;
  }
}

describe('IntervalJob', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('runs on its timer and counts every run, by result, for the monitoring', async () => {
    const registry = new MetricsRegistry('worker', false);
    const job = new CountingJob(new JobMetrics(registry));
    job.onApplicationBootstrap();

    await jest.advanceTimersByTimeAsync(1_000);
    job.isFailing = true;
    await jest.advanceTimersByTimeAsync(1_000);
    job.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(5_000);

    const text = await registry.text();
    expect(job.runs).toBe(2);
    expect(text).toContain(
      'wattwisely_worker_job_runs_total{job="CountingJob",result="ok",service="worker"} 1',
    );
    expect(text).toContain(
      'wattwisely_worker_job_runs_total{job="CountingJob",result="failed",service="worker"} 1',
    );
    expect(text).toContain(
      'wattwisely_worker_job_interval_seconds{job="CountingJob",service="worker"} 1',
    );
    expect(text).toMatch(
      /wattwisely_worker_job_last_success_timestamp_seconds\{job="CountingJob",service="worker"\} \d+/,
    );
  });
});
