import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test, TestingModule } from '@nestjs/testing';
import { Client } from 'pg';
import {
  TestAddons,
  TestBilling,
  TestData,
  TestDatabase,
  TestIntegrations,
  TestManaged,
  TestNotifications,
  TestPayments,
  TestPlatform,
  TestSessions,
  TestTariffs,
} from '@wattwisely/db/testing';
import { FileStore, MemoryFileStore } from '@wattwisely/file-storage';
import { MESSAGING_PROVIDER } from '@wattwisely/messaging';
import { FakeMessagingProvider } from '@wattwisely/messaging/testing';
import { PAYMENT_GATEWAY } from '@wattwisely/payments';
import { FakePaymentGateway } from '@wattwisely/payments/testing';
import { ChargerEvent, NotifyChannels } from '@wattwisely/ocpp-contracts';
import { AppModule } from '../app.module';
import { WorkerMailSender } from '../mail/worker-mail.sender';
import { WorkerServer } from '../worker.server';
import { RecordingMailSender } from './recording-mail.sender';

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
    INVOICE_INTERVAL_MS: '3600000',
    ALERT_SCAN_INTERVAL_MS: '3600000',
    SESSION_NOTIFY_INTERVAL_MS: '3600000',
    NOTIFICATION_SEND_INTERVAL_MS: '3600000',
    REPORT_EXPORT_INTERVAL_MS: '3600000',
    REPORT_SCHEDULE_INTERVAL_MS: '3600000',
    RETENTION_INTERVAL_MS: '3600000',
    QUEUE_STATS_INTERVAL_MS: '3600000',
    WEBHOOK_INTERVAL_MS: '3600000',
    LOAD_MANAGEMENT_INTERVAL_MS: '3600000',
    MESSAGING_INTERVAL_MS: '3600000',
    /** Tests receive deliveries on a local port. */
    WEBHOOK_ALLOW_PRIVATE_URLS: 'true',
  };
  static readonly MAIL = {
    SMTP_HOST: 'localhost',
    SMTP_FROM: 'no-reply@wattwisely.test',
    API_URL: 'http://api.test',
    PORTAL_URL: 'http://portal.test',
    DRIVER_URL: 'http://driver.test',
  };

  database!: TestDatabase;
  data!: TestData;
  tariffs!: TestTariffs;
  sessions!: TestSessions;
  payments!: TestPayments;
  managed!: TestManaged;
  notifications!: TestNotifications;
  platform!: TestPlatform;
  billing!: TestBilling;
  /** Module 16's API keys and webhook endpoints. */
  integrations!: TestIntegrations;
  /** Module 17's load policies, chat channels and the charger states they depend on. */
  addons!: TestAddons;
  /** Every e-mail the worker sent. */
  readonly mail = new RecordingMailSender();
  /** The payment provider in memory the jobs talk to. */
  readonly gateway = new FakePaymentGateway();
  /** The messaging app in memory the chat jobs talk to (module 17). */
  readonly chat = new FakeMessagingProvider();
  app!: NestFastifyApplication;
  /** Object storage in memory, used when the worker was created with `isUsingObjectStorage`. */
  readonly files = new MemoryFileStore();
  /** Every live event the worker announced, in order. */
  readonly events: ChargerEvent[] = [];
  private listener: Client | null = null;

  /** Without object storage, export files stay in Postgres as in module 11. */
  constructor(private readonly isUsingObjectStorage = false) {}

  async start(): Promise<this> {
    this.database = await TestDatabase.create();
    this.data = new TestData(this.database);
    this.tariffs = new TestTariffs(this.data);
    this.sessions = new TestSessions(this.data);
    this.payments = new TestPayments(this.data);
    this.managed = new TestManaged(this.data);
    this.notifications = new TestNotifications(this.data);
    this.platform = new TestPlatform(this.data);
    this.billing = new TestBilling(this.data);
    this.integrations = new TestIntegrations(this.data);
    this.addons = new TestAddons(this.data);
    Object.assign(process.env, TestWorker.INTERVALS, TestWorker.MAIL, {
      PORT: '3299',
      DATABASE_URL: this.database.urlFor('wattwisely_app'),
      LOG_LEVEL: 'silent',
    });
    const moduleRef = await this.compile();
    this.app = moduleRef.createNestApplication<NestFastifyApplication>(
      WorkerServer.createAdapter(),
      { logger: false },
    );
    await this.app.init();
    await this.listen();
    return this;
  }

  private compile(): Promise<TestingModule> {
    const builder = Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PAYMENT_GATEWAY)
      .useValue(this.gateway)
      .overrideProvider(WorkerMailSender)
      .useValue(this.mail)
      .overrideProvider(MESSAGING_PROVIDER)
      .useValue(this.chat);
    if (this.isUsingObjectStorage) {
      builder.overrideProvider(FileStore).useValue(this.files);
    }
    return builder.compile();
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
