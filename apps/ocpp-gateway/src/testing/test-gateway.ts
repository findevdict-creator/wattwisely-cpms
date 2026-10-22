import { AddressInfo } from 'node:net';
import { NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { ChargerOptions, SimulatedCharger } from '@wattwisely/charger-sim';
import { TestData, TestDatabase } from '@wattwisely/db/testing';
import { ChargerEvent, CommandNotification, NotifyChannels } from '@wattwisely/ocpp-contracts';
import { AppModule } from '../app.module';
import { GatewayServer } from '../gateway.server';
import { NotificationCollector } from './notification-collector';

/**
 * The real gateway on a random port and a fresh test database, with short timings so
 * the flows that wait (command timeout, boot rejection, disconnect grace) finish fast.
 */
export class TestGateway {
  static readonly TIMINGS = {
    OCPP_HEARTBEAT_INTERVAL_S: '10',
    OCPP_WATCH_INTERVAL_MS: '200',
    OCPP_LEASE_SECONDS: '5',
    OCPP_COMMAND_TIMEOUT_MS: '400',
    OCPP_PING_TIMEOUT_MS: '300',
    OCPP_REJECT_CLOSE_DELAY_MS: '100',
    OCPP_DISCONNECT_GRACE_MS: '300',
  };

  database!: TestDatabase;
  data!: TestData;
  app!: NestFastifyApplication;
  url!: string;
  events!: NotificationCollector<ChargerEvent>;

  async start(environment: Record<string, string> = {}): Promise<this> {
    this.database = await TestDatabase.create();
    this.data = new TestData(this.database);
    Object.assign(process.env, TestGateway.environment(this.database), environment);
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    this.app = moduleRef.createNestApplication<NestFastifyApplication>(
      GatewayServer.createAdapter(false),
      { logger: false },
    );
    await GatewayServer.configure(this.app);
    await this.app.listen(0, '127.0.0.1');
    const { port } = this.app.getHttpServer().address() as AddressInfo;
    this.url = `ws://127.0.0.1:${port}/ocpp`;
    this.events = await new NotificationCollector<ChargerEvent>(
      this.database.urlFor('wattwisely_app'),
      NotifyChannels.EVENTS,
    ).start();
    return this;
  }

  async stop(): Promise<void> {
    await this.events?.stop();
    await this.app?.close();
    await this.database?.drop();
  }

  charger(identity: string, options: Partial<ChargerOptions> = {}): SimulatedCharger {
    return new SimulatedCharger({ url: this.url, identity, ...options });
  }

  /** Does what the API does: inserts a command row and tells the gateway. */
  async queueCommand(
    command: { tenantId: string; chargerId: string; action: string; payload: object },
    queuedForMinutes = 5,
  ): Promise<string> {
    const { rows } = await this.data.sql(
      `insert into charger_commands (id, tenant_id, charger_id, action, payload, queued_until, requested_by_label)
       values (gen_random_uuid(), $1, $2, $3, $4, now() + make_interval(mins => $5), 'test')
       returning id`,
      [
        command.tenantId,
        command.chargerId,
        command.action,
        JSON.stringify(command.payload),
        queuedForMinutes,
      ],
    );
    const notification: CommandNotification = {
      command_id: rows[0].id,
      charger_id: command.chargerId,
      tenant_id: command.tenantId,
    };
    await this.data.sql('select pg_notify($1, $2)', [
      NotifyChannels.COMMANDS,
      JSON.stringify(notification),
    ]);
    return rows[0].id;
  }

  async row<T = Record<string, unknown>>(text: string, values: unknown[] = []): Promise<T | null> {
    const { rows } = await this.data.sql(text, values);
    return (rows[0] as T | undefined) ?? null;
  }

  /** Polls a query until it returns a row (for state that changes after a reply was sent). */
  async eventually<T = Record<string, unknown>>(
    text: string,
    values: unknown[] = [],
    timeoutMs = 5_000,
  ): Promise<T> {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) {
      const row = await this.row<T>(text, values);
      if (row) {
        return row;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    throw new Error(`No row for "${text}" within ${timeoutMs} ms.`);
  }

  private static environment(database: TestDatabase): Record<string, string> {
    return {
      ...TestGateway.TIMINGS,
      PORT: '3199',
      DATABASE_URL: database.urlFor('wattwisely_app'),
      OCPP_INSTANCE_ID: 'test-gateway',
      OCPP_REQUIRE_TLS: 'false',
      OCPP_TRUST_PROXY: 'false',
      OCPP_ACCEPT_UNKNOWN_ID_TAGS: 'false',
      LOG_LEVEL: 'silent',
    };
  }
}
