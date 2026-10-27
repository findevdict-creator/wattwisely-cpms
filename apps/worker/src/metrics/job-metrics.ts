import { Injectable } from '@nestjs/common';
import { MetricsRegistry } from '@wattwisely/observability';

/**
 * How the worker's timed jobs are doing (module 12): every run, how long it took, how often
 * the job is meant to run and when it last finished without an error. The "job stalled"
 * alert compares the last two.
 */
@Injectable()
export class JobMetrics {
  private readonly runs;
  private readonly duration;
  private readonly lastSuccess;
  private readonly interval;

  constructor(metrics: MetricsRegistry) {
    this.runs = metrics.counter('worker_job_runs_total', 'Job runs, by result', ['job', 'result']);
    this.duration = metrics.histogram('worker_job_duration_seconds', 'How long a job run took', [
      'job',
    ]);
    this.lastSuccess = metrics.gauge(
      'worker_job_last_success_timestamp_seconds',
      'When the job last finished a run without an error (Unix time)',
      ['job'],
    );
    this.interval = metrics.gauge('worker_job_interval_seconds', 'How often the job runs', ['job']);
  }

  /**
   * A job's timer started. Its last success starts at now, so a job that never manages a
   * run still raises the "job stalled" alert.
   */
  started(job: string, intervalSeconds: number): void {
    this.interval.set({ job }, intervalSeconds);
    this.lastSuccess.set({ job }, Date.now() / 1000);
  }

  record(job: string, seconds: number, isOk: boolean): void {
    this.runs.inc({ job, result: isOk ? 'ok' : 'failed' });
    this.duration.observe({ job }, seconds);
    if (isOk) {
      this.lastSuccess.set({ job }, Date.now() / 1000);
    }
  }
}
