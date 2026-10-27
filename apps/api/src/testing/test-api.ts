import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import {
  TestBilling,
  TestData,
  TestDatabase,
  TestManaged,
  TestNotifications,
  TestPayments,
  TestPlatform,
} from '@wattwisely/db/testing';
import { FileStore, MemoryFileStore } from '@wattwisely/file-storage';
import { PAYMENT_GATEWAY } from '@wattwisely/payments';
import { FakePaymentGateway } from '@wattwisely/payments/testing';
import { ApiServer } from '../api.server';
import { AppModule } from '../app.module';
import { KeycloakKeySetProvider } from '../common/auth/keycloak-key-set.provider';
import { MailSender } from '../common/mail/mail.sender';
import { RecordingMailSender } from './recording-mail.sender';
import { TestTokenIssuer } from './test-token.issuer';

/** Request options for TestApi.call. */
export interface TestRequest {
  token?: string;
  tenantId?: string;
  body?: object;
  /** Sent as If-Match, the version an update expects. */
  version?: number;
  /** Extra headers, e.g. a webhook signature. */
  headers?: Record<string, string>;
  /** A body sent as is, e.g. a webhook's raw JSON. */
  rawBody?: string;
}

/**
 * The real API in memory (all modules, guards, error handling) on a fresh test
 * database, with a fake Keycloak, a mail sender that only records and a payment
 * provider in memory.
 */
export class TestApi {
  readonly mail = new RecordingMailSender();
  readonly gateway = new FakePaymentGateway();
  /** Object storage in memory (module 12): where the worker would have put export files. */
  readonly files = new MemoryFileStore();
  issuer!: TestTokenIssuer;
  database!: TestDatabase;
  data!: TestData;
  payments!: TestPayments;
  platform!: TestPlatform;
  managed!: TestManaged;
  /** Module 15's invoices and lines. */
  billing!: TestBilling;
  notifications!: TestNotifications;
  app!: NestFastifyApplication;

  /** `environment` adds or replaces settings, e.g. to switch the rate limits on. */
  async start(environment: Record<string, string> = {}): Promise<this> {
    this.issuer = await new TestTokenIssuer().init();
    this.database = await TestDatabase.create();
    this.data = new TestData(this.database);
    this.payments = new TestPayments(this.data);
    this.platform = new TestPlatform(this.data);
    this.managed = new TestManaged(this.data);
    this.billing = new TestBilling(this.data);
    this.notifications = new TestNotifications(this.data);
    Object.assign(process.env, TestApi.environment(this.database), environment);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KeycloakKeySetProvider)
      .useValue({ getKeySet: () => this.issuer.getKeySet(), isReachable: async () => true })
      .overrideProvider(MailSender)
      .useValue(this.mail)
      .overrideProvider(PAYMENT_GATEWAY)
      .useValue(this.gateway)
      .overrideProvider(FileStore)
      .useValue(this.files)
      .compile();
    this.app = moduleRef.createNestApplication<NestFastifyApplication>(ApiServer.createAdapter(), {
      logger: false,
      ...ApiServer.OPTIONS,
    });
    ApiServer.configure(this.app);
    await this.app.init();
    await this.app.getHttpAdapter().getInstance().ready();
    return this;
  }

  async stop(): Promise<void> {
    await this.app?.close();
    await this.database?.drop();
  }

  async call(
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE',
    url: string,
    request: TestRequest = {},
  ) {
    const headers: Record<string, string> = { ...request.headers };
    if (request.version !== undefined) {
      headers['if-match'] = String(request.version);
    }
    if (request.token) {
      headers['authorization'] = `Bearer ${request.token}`;
    }
    if (request.tenantId) {
      headers['x-tenant-id'] = request.tenantId;
    }
    if (request.rawBody !== undefined) {
      headers['content-type'] = 'application/json';
    }
    return this.app.inject({ method, url, headers, payload: request.rawBody ?? request.body });
  }

  private static environment(database: TestDatabase): Record<string, string> {
    return {
      KEYCLOAK_ISSUER_URL: TestTokenIssuer.ISSUER,
      CORS_ORIGINS: 'http://portal.test,http://admin.test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: database.urlFor('wattwisely_app'),
      API_URL: 'http://api.test',
      PORTAL_URL: 'http://portal.test',
      OCPP_URL: 'wss://ocpp.test/ocpp',
      OCPP_PLAIN_URL: 'ws://ocpp-plain.test/ocpp',
      DRIVER_URL: 'http://charge.test',
      SMTP_HOST: 'smtp.test',
      SMTP_FROM: 'no-reply@wattwisely.test',
      // Tests call the API hundreds of times a minute from one address; the rate limit test turns them on.
      RATE_LIMIT_ENABLED: 'false',
      TRUST_PROXY_HOPS: '0',
      API_DOCS_ENABLED: 'true',
    };
  }
}
