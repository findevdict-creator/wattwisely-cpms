import { Client } from 'pg';

/** Listens on one Postgres NOTIFY channel and hands tests the payloads as they arrive. */
export class NotificationCollector<T> {
  readonly received: T[] = [];
  private waiters: { matches: (event: T) => boolean; resolve: (event: T) => void }[] = [];
  private client: Client | null = null;

  constructor(
    private readonly connectionString: string,
    private readonly channel: string,
  ) {}

  async start(): Promise<this> {
    this.client = new Client({ connectionString: this.connectionString });
    await this.client.connect();
    this.client.on('notification', (notification) =>
      this.receive(JSON.parse(notification.payload ?? '{}') as T),
    );
    await this.client.query(`listen ${this.channel}`);
    return this;
  }

  async stop(): Promise<void> {
    await this.client?.end();
  }

  /** The first event (already received or still to come) the predicate accepts. */
  next(matches: (event: T) => boolean, timeoutMs = 5_000): Promise<T> {
    const found = this.received.find(matches);
    if (found) {
      this.received.splice(this.received.indexOf(found), 1);
      return Promise.resolve(found);
    }
    return new Promise((resolve, reject) => {
      const waiter = { matches, resolve: (event: T) => (clearTimeout(timer), resolve(event)) };
      const timer = setTimeout(() => {
        this.waiters = this.waiters.filter((other) => other !== waiter);
        reject(new Error(`No matching ${this.channel} notification within ${timeoutMs} ms.`));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }

  private receive(event: T): void {
    const waiter = this.waiters.find((candidate) => candidate.matches(event));
    if (waiter) {
      this.waiters = this.waiters.filter((other) => other !== waiter);
      waiter.resolve(event);
    } else {
      this.received.push(event);
    }
  }
}
