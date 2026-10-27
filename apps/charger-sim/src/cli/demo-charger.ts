import { ChargerMessages, ConnectRefused, SimulatedCharger } from '@wattwisely/charger-sim';
import { CommandAnswers } from './command-answers';
import { ConnectorState } from './connector-state';
import { SimOptions } from './sim-options';

/**
 * A charge point you can run against a gateway: it connects, boots, sends heartbeats and
 * status, charges when told to, and reconnects by itself when the socket drops.
 */
export class DemoCharger {
  static readonly RECONNECT_DELAY_MS = 5_000;
  /** The longest timer Node allows (about 24.8 days); anything larger fires after 1 ms. */
  static readonly MAX_TIMER_MS = 2_147_483_647;

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
    });
    const messages = new ChargerMessages(charger);
    this.charger = charger;
    this.connectors = this.connectorsFor(messages);
    new CommandAnswers(this.options, this.connectors, (line) => this.log(line)).install(
      charger,
      () => this.reset(charger),
    );
    await charger.connect();
    this.log(`connected to ${this.options.url}`);
    await this.boot(messages);
    const code = await charger.closed(DemoCharger.MAX_TIMER_MS);
    this.clearHeartbeat();
    this.connectors.forEach((connector) => connector.suspend());
    this.log(`socket closed with ${code}`);
  }

  private async boot(messages: ChargerMessages): Promise<void> {
    const boot = await messages.boot();
    this.log(`boot ${boot.status}, heartbeat every ${boot.interval} s`);
    if (boot.status !== 'Accepted') {
      return;
    }
    this.heartbeat = setInterval(() => void this.sendHeartbeat(messages), boot.interval * 1000);
    await messages.status(0, 'Available');
    for (const connector of this.connectors) {
      await connector.setStatus(connector.status);
    }
    await this.tapCard(messages);
  }

  /** `--tag`: a driver holds their RFID card against connector 1, once (module 13). */
  private async tapCard(messages: ChargerMessages): Promise<void> {
    const tag = this.options.tag;
    if (!tag || this.hasTappedCard) {
      return;
    }
    this.hasTappedCard = true;
    const answer = await messages.authorize(tag);
    this.log(`authorize ${tag}: ${answer.idTagInfo.status}`);
    if (answer.idTagInfo.status === 'Accepted') {
      await this.connectors[0]?.startCharging(
        tag,
        this.options.powerW,
        this.options.meterIntervalS,
      );
    }
  }

  private async sendHeartbeat(messages: ChargerMessages): Promise<void> {
    try {
      await messages.heartbeat();
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

  private connectorsFor(messages: ChargerMessages): ConnectorState[] {
    return Array.from(
      { length: this.options.connectors },
      (_, index) => new ConnectorState(index + 1, messages, (line) => this.log(line)),
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
