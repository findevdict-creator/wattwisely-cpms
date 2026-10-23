import { LatencyStats } from './latency-stats';

describe('LatencyStats', () => {
  it('takes percentiles by nearest rank', () => {
    const sorted = Array.from({ length: 100 }, (_, i) => i + 1);
    expect(LatencyStats.percentile(sorted, 50)).toBe(50);
    expect(LatencyStats.percentile(sorted, 95)).toBe(95);
    expect(LatencyStats.percentile(sorted, 99)).toBe(99);
    expect(LatencyStats.percentile([7], 99)).toBe(7);
    expect(LatencyStats.percentile([], 95)).toBe(0);
  });

  it('summarises each action, busiest first, and counts failures as calls', () => {
    const stats = new LatencyStats();
    [10, 20, 30, 40].forEach((ms) => stats.record('Heartbeat', ms));
    stats.record('BootNotification', 100);
    stats.fail('BootNotification');
    stats.fail('MeterValues');

    expect(stats.summary()).toEqual([
      { action: 'Heartbeat', count: 4, failed: 0, p50: 20, p95: 40, p99: 40, max: 40 },
      { action: 'BootNotification', count: 2, failed: 1, p50: 100, p95: 100, p99: 100, max: 100 },
      { action: 'MeterValues', count: 1, failed: 1, p50: 0, p95: 0, p99: 0, max: 0 },
      { action: 'all', count: 7, failed: 2, p50: 30, p95: 100, p99: 100, max: 100 },
    ]);
    expect(stats.callCount).toBe(5);
  });
});
