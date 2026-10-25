import { ConnectRefused, SimulatedCharger } from '@wattwisely/charger-sim';
import { CommandAnswers } from './command-answers';
import { ConnectorState } from './connector-state';
import { SimOptions } from './sim-options';
import { StationDialect } from './station-dialect';
import { V16Dialect } from './v16-dialect';
import { V201Dialect } from './v201-dialect';

/**
 * A charge point you can run against a gateway: it connects, boots, sends heartbeats and
 * status, charges when told to, and reconnects by itself when the socket drops. It speaks
 * OCPP 1.6J, or 2.0.1 with `--ocpp 2.0.1` (module 18); the dialect holds the difference.
 */
export class DemoCharger {
  static readonly RECONNECT_DELAY_MS = 5_000;

  private charger: SimulatedCharger | null = null;
  private heartbeat: NodeJS.Timeout | null = null;
  private connectors: ConnectorState[] = [];
  private isStopping = false;
  private hasTappedCard = false;

  constructor(private readonly options: SimOptions) {}

  async run(): Promise<void> {
    while (!this.isStopping) {
      try {
        await this.session();
      } catch (error) {
        this.log(
          error instanceof ConnectRefused
            ? error.message
            : `connection lost: ${(error as Error).message}`,
        );
      }
      if (!this.isStopping) {
        this.log(`reconnecting in ${DemoCharger.RECONNECT_DELAY_MS / 1000} s`);
        await new Promise((resolve) => setTimeout(resolve, DemoCharger.RECONNECT_DELAY_MS));
      }
    }
  }

  async stop(): Promise<void> {
    this.isStopping = true;
    this.clearHeartbeat();
    await this.charger?.close();
    process.exit(0);
  }

  /** One connection from open to close. */
  private async session(): Promise<void> {
    const charger = new SimulatedCharger({
      url: this.options.url,
      identity: this.options.identity,
      password: this.options.password,
      vendor: this.options.vendor,
      model: this.options.model,
      serial: this.options.serial,
      protocols: this.options.ocpp === '2.0.1' ? V201Dialect.PROTOCOLS : V16Dialect.PROTOCOLS,
    });
    const dialect = this.dialectFor(charger);
    this.charger = charger;
    this.connectors = this.connectorsFor(dialect);
    const answers = new CommandAnswers(
      this.options,
      this.connectors,
      (line) => this.log(line),
      () => this.reset(charger),
    );
    dialect.installCommands(charger, answers);
    await charger.connect();
    this.log(`connected to ${this.options.url} as ${charger.protocol}`);
    await this.boot(dialect);
    const code = await charger.closed(Number.MAX_SAFE_INTEGER);
    this.clearHeartbeat();
    this.connectors.forEach((connector) => connector.suspend());
    this.log(`socket closed with ${code}`);
  }

  private async boot(dialect: StationDialect): Promise<void> {
    const boot = await dialect.boot();
    this.log(`boot ${boot.status}, heartbeat every ${boot.interval} s`);
    if (boot.status !== 'Accepted') {
      return;
    }
    this.heartbeat = setInterval(() => void this.sendHeartbeat(dialect), boot.interval * 1000);
    await dialect.announceStation();
    for (const connector of this.connectors) {
      await connector.setStatus(connector.status);
    }
    await this.tapCard(dialect);
  }

  /** `--tag`: a driver holds their RFID card against connector 1, once (module 13). */
  private async tapCard(dialect: StationDialect): Promise<void> {
    const tag = this.options.tag;
    if (!tag || this.hasTappedCard) {
      return;
    }
    this.hasTappedCard = true;
    const status = await dialect.authorize(tag);
    this.log(`authorize ${tag}: ${status}`);
    if (status === 'Accepted') {
      await this.connectors[0]?.startCharging(
        tag,
        this.options.powerW,
        this.options.meterIntervalS,
      );
    }
  }

  private async sendHeartbeat(dialect: StationDialect): Promise<void> {
    try {
      await dialect.heartbeat();
    } catch (error) {
      this.log(`heartbeat failed: ${(error as Error).message}`);
    }
  }

  private async reset(charger: SimulatedCharger): Promise<void> {
    for (const connector of this.connectors) {
      await connector.stopCharging('Reboot').catch(() => undefined);
    }
    await charger.close(1001, 'Resetting');
  }

  private dialectFor(charger: SimulatedCharger): StationDialect {
    return this.options.ocpp === '2.0.1' ? new V201Dialect(charger) : new V16Dialect(charger);
  }

  private connectorsFor(dialect: StationDialect): ConnectorState[] {
    return Array.from(
      { length: this.options.connectors },
      (_, index) => new ConnectorState(index + 1, dialect, (line) => this.log(line)),
    );
  }

  private clearHeartbeat(): void {
    if (this.heartbeat) {
      clearInterval(this.heartbeat);
      this.heartbeat = null;
    }
  }

  private log(line: string): void {
    process.stdout.write(`${new Date().toISOString()} [${this.options.identity}] ${line}\n`);
  }
}
