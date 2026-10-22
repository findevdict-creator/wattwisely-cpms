import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { ApiServer } from '../api.server';
import { AppModule } from '../app.module';
import { KeycloakKeySetProvider } from '../common/auth/keycloak-key-set.provider';
import { MailSender } from '../common/mail/mail.sender';
import { RecordingMailSender } from './recording-mail.sender';
import { TestData } from './test-data';
import { TestDatabase } from './test-database';
import { TestTokenIssuer } from './test-token.issuer';

/** Request options for TestApi.call. */
export interface TestRequest {
  token?: string;
  tenantId?: string;
  body?: object;
  /** Sent as If-Match, the version an update expects. */
  version?: number;
}

/**
 * The real API in memory (all modules, guards, error handling) on a fresh test
 * database, with a fake Keycloak and a mail sender that only records.
 */
export class TestApi {
  readonly mail = new RecordingMailSender();
  issuer!: TestTokenIssuer;
  database!: TestDatabase;
  data!: TestData;
  app!: NestFastifyApplication;

  async start(): Promise<this> {
    this.issuer = await new TestTokenIssuer().init();
    this.database = await TestDatabase.create();
    this.data = new TestData(this.database);
    Object.assign(process.env, TestApi.environment(this.database));
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(KeycloakKeySetProvider)
      .useValue({ getKeySet: () => this.issuer.getKeySet(), isReachable: async () => true })
      .overrideProvider(MailSender)
      .useValue(this.mail)
      .compile();
    this.app = moduleRef.createNestApplication<NestFastifyApplication>(ApiServer.createAdapter(), {
      logger: false,
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
    const headers: Record<string, string> = {};
    if (request.version !== undefined) {
      headers['if-match'] = String(request.version);
    }
    if (request.token) {
      headers['authorization'] = `Bearer ${request.token}`;
    }
    if (request.tenantId) {
      headers['x-tenant-id'] = request.tenantId;
    }
    return this.app.inject({ method, url, headers, payload: request.body });
  }

  private static environment(database: TestDatabase): Record<string, string> {
    return {
      KEYCLOAK_ISSUER_URL: TestTokenIssuer.ISSUER,
      CORS_ORIGINS: 'http://portal.test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: database.urlFor('wattwisely_app'),
      PORTAL_URL: 'http://portal.test',
      OCPP_URL: 'wss://ocpp.test/ocpp',
      OCPP_PLAIN_URL: 'ws://ocpp-plain.test/ocpp',
      SMTP_HOST: 'smtp.test',
      SMTP_FROM: 'no-reply@wattwisely.test',
    };
  }
}
