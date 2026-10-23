import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';

/** What a gauge reads when Prometheus scrapes, instead of being set by the code. */
export type GaugeReader = () => number | Promise<number>;

/**
 * One service's metrics in the Prometheus text format (module 12). Every metric is named
 * `wattwisely_…` and carries a `service` label, so one Grafana dashboard reads the API,
 * the gateway and the worker side by side. The Node.js process metrics (memory, CPU,
 * event loop lag) come along unless switched off, which tests do.
 */
export class MetricsRegistry {
  static readonly PREFIX = 'wattwisely_';
  /** Seconds; from a quick database read to a slow charger reply. */
  static readonly DURATION_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 30];

  private readonly registry = new Registry();

  constructor(
    readonly service: string,
    isCollectingProcessMetrics = true,
  ) {
    this.registry.setDefaultLabels({ service });
    if (isCollectingProcessMetrics) {
      collectDefaultMetrics({ register: this.registry });
    }
  }

  get contentType(): string {
    return this.registry.contentType;
  }

  counter<T extends string>(name: string, help: string, labelNames: readonly T[] = []): Counter<T> {
    return new Counter({
      name: MetricsRegistry.PREFIX + name,
      help,
      labelNames,
      registers: [this.registry],
    });
  }

  /** A gauge the code sets, or one that asks `read` at every scrape. */
  gauge<T extends string>(
    name: string,
    help: string,
    labelNames: readonly T[] = [],
    read?: GaugeReader,
  ): Gauge<T> {
    return new Gauge({
      name: MetricsRegistry.PREFIX + name,
      help,
      labelNames,
      registers: [this.registry],
      ...(read && {
        async collect(this: Gauge<T>) {
          this.set(await read());
        },
      }),
    });
  }

  histogram<T extends string>(
    name: string,
    help: string,
    labelNames: readonly T[] = [],
    buckets: number[] = MetricsRegistry.DURATION_BUCKETS,
  ): Histogram<T> {
    return new Histogram({
      name: MetricsRegistry.PREFIX + name,
      help,
      labelNames,
      buckets,
      registers: [this.registry],
    });
  }

  /** Everything, as GET /metrics answers it. */
  text(): Promise<string> {
    return this.registry.metrics();
  }
}
