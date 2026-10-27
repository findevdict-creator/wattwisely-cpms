import { MetricsRegistry } from './metrics-registry';

describe('MetricsRegistry', () => {
  it('names every metric wattwisely_… and labels it with the service', async () => {
    const metrics = new MetricsRegistry('api', false);
    metrics.counter('things_total', 'Things', ['kind']).inc({ kind: 'a' }, 2);

    const text = await metrics.text();

    expect(text).toContain('# TYPE wattwisely_things_total counter');
    expect(text).toContain('wattwisely_things_total{kind="a",service="api"} 2');
  });

  it('reads a gauge with a reader at every scrape', async () => {
    const metrics = new MetricsRegistry('gateway', false);
    let connections = 3;
    metrics.gauge('connections', 'Open sockets', [], () => connections);

    expect(await metrics.text()).toContain('wattwisely_connections{service="gateway"} 3');
    connections = 5;
    expect(await metrics.text()).toContain('wattwisely_connections{service="gateway"} 5');
  });

  it('keeps histograms in seconds with the shared buckets', async () => {
    const metrics = new MetricsRegistry('worker', false);
    metrics.histogram('job_duration_seconds', 'Job runs', ['job']).observe({ job: 'x' }, 0.3);

    const text = await metrics.text();

    expect(text).toContain(
      'wattwisely_job_duration_seconds_bucket{le="0.5",service="worker",job="x"} 1',
    );
    expect(text).toContain('wattwisely_job_duration_seconds_count{service="worker",job="x"} 1');
  });

  it('adds the Node.js process metrics unless told not to', async () => {
    expect(await new MetricsRegistry('api').text()).toContain('process_cpu_seconds_total');
    expect(await new MetricsRegistry('api', false).text()).not.toContain('process_cpu');
  });
});
