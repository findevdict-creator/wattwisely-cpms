import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { Client } from 'pg';
import {
  TestData,
  TestDatabase,
  TestManaged,
  TestPayments,
  TestPlatform,
  TestSessions,
  TestTariffs,
} from '@wattwisely/db/testing';
import { PAYMENT_GATEWAY } from '@wattwisely/payments';
import { FakePaymentGateway } from '@wattwisely/payments/testing';
import { ChargerEvent, NotifyChannels } from '@wattwisely/ocpp-contracts';
import { AppModule } from '../app.module';
import { WorkerServer } from '../worker.server';

/**
 * The real worker on a fresh test database. Its timers are set far apart, so a test
 * runs a job with `runOnce` and then looks at the database.
 */
export class TestWorker {
  static readonly INTERVALS = {
    SESSION_FINALISE_INTERVAL_MS: '3600000',
    SESSION_LIVE_COST_INTERVAL_MS: '3600000',
    SESSION_STALE_SWEEP_INTERVAL_MS: '3600000',
    PAYMENT_SETTLE_INTERVAL_MS: '3600000',
    SESSION_START_TIMEOUT_INTERVAL_MS: '3600000',
    PAYMENT_WEBHOOK_RETRY_INTERVAL_MS: '3600000',
    MANAGED_SERVICE_END_INTERVAL_MS: '3600000',
  };

  database!: TestDatabase;
  data!: TestData;
  tariffs!: TestTariffs;
  sessions!: TestSessions;
  payments!: TestPayments;
  managed!: TestManaged;
  platform!: TestPlatform;
  /** The payment provider in memory the jobs talk to. */
  readonly gateway = new FakePaymentGateway();
  app!: NestFastifyApplication;
  /** Every live event the worker announced, in order. */
  readonly events: ChargerEvent[] = [];
  private listener: Client | null = null;

  async start(): Promise<this> {
    this.database = await TestDatabase.create();
    this.data = new TestData(this.database);
    this.tariffs = new TestTariffs(this.data);
    this.sessions = new TestSessions(this.data);
    this.payments = new TestPayments(this.data);
    this.managed = new TestManaged(this.data);
    this.platform = new TestPlatform(this.data);
    Object.assign(process.env, TestWorker.INTERVALS, {
      PORT: '3299',
      DATABASE_URL: this.database.urlFor('wattwisely_app'),
      LOG_LEVEL: 'silent',
    });
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PAYMENT_GATEWAY)
      .useValue(this.gateway)
      .compile();
    this.app = moduleRef.createNestApplication<NestFastifyApplication>(
      WorkerServer.createAdapter(),
      { logger: false },
    );
    await this.app.init();
    await this.listen();
    return this;
  }

  async stop(): Promise<void> {
    await this.listener?.end();
    await this.app?.close();
    await this.database?.drop();
  }

  /** Waits a moment for NOTIFY to arrive, then returns the events of this type. */
  async eventsOf(type: ChargerEvent['type']): Promise<ChargerEvent[]> {
    await new Promise((resolve) => setTimeout(resolve, 100));
    return this.events.filter((event) => event.type === type);
  }

  private async listen(): Promise<void> {
    this.listener = new Client({ connectionString: this.database.urlFor('wattwisely_app') });
    await this.listener.connect();
    this.listener.on('notification', (message) => {
      this.events.push(JSON.parse(message.payload ?? '{}') as ChargerEvent);
    });
    await this.listener.query(`listen ${NotifyChannels.EVENTS}`);
  }

  async row(text: string, values: unknown[] = []): Promise<Record<string, unknown> | null> {
    const { rows } = await this.data.sql(text, values);
    return rows[0] ?? null;
  }
}
