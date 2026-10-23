import { ChargerMessages, ConnectRefused, SimulatedCharger } from '@wattwisely/charger-sim';
import { LoadContext } from './load-context';

/**
 * One simulated charger of a load test: connects, boots, reports its connector, then sends
 * Heartbeats and MeterValues on its timers, timing every answer. With sessions it also
 * starts a charge and stops it at the end. It accepts any command the platform sends.
 */
export class LoadCharger {
  static readonly CONNECTOR_ID = 1;
  static readonly POWER_W = 7_400;
  /** Longer than the gateway's own limits, so a slow answer counts as slow, not as lost. */
  static readonly REPLY_TIMEOUT_MS = 30_000;
  static readonly COMMAND_ANSWERS: Record<string, unknown> = {
    RemoteStartTransaction: { status: 'Accepted' },
    RemoteStopTransaction: { status: 'Accepted' },
    Reset: { status: 'Accepted' },
    ChangeAvailability: { status: 'Accepted' },
    UnlockConnector: { status: 'Unlocked' },
    ChangeConfiguration: { status: 'Accepted' },
    GetConfiguration: { configurationKey: [], unknownKey: [] },
    TriggerMessage: { status: 'Accepted' },
    ClearCache: { status: 'Accepted' },
  };

  private readonly charger: SimulatedCharger;
  private readonly messages: ChargerMessages;
  private readonly timers: NodeJS.Timeout[] = [];
  private energyWh = 0;
  private transactionId: number | undefined;
  private isRunning = false;

  constructor(
    readonly identity: string,
    private readonly context: LoadContext,
  ) {
    const { url, password } = context.options;
    this.charger = new SimulatedCharger({
      url,
      identity,
      password,
      serial: identity,
      replyTimeoutMs: LoadCharger.REPLY_TIMEOUT_MS,
    });
    this.messages = new ChargerMessages(this.charger);
    for (const [action, answer] of Object.entries(LoadCharger.COMMAND_ANSWERS)) {
      this.charger.on(action, () => answer);
    }
  }

  /** Connects and boots. False when the gateway refused it or the network failed (both counted). */
  async start(): Promise<boolean> {
    if (!(await this.connect())) {
      return false;
    }
    const boot = await this.timed('BootNotification', () => this.messages.boot());
    if (boot?.status !== 'Accepted') {
      this.context.connections.error(`BootNotification answered ${boot?.status ?? 'nothing'}`);
      await this.charger.close();
      return false;
    }
    this.isRunning = true;
    await this.timed('StatusNotification', () =>
      this.messages.status(LoadCharger.CONNECTOR_ID, 'Available'),
    );
    if (this.context.options.isStartingSessions) {
      await this.startSession();
    }
    this.every(this.context.options.heartbeatS, () =>
      this.timed('Heartbeat', () => this.messages.heartbeat()),
    );
    this.every(this.context.options.meterS, () => this.sendMeterValues());
    return true;
  }

  /** Stops the timers, ends a running charge and closes the socket. */
  async stop(): Promise<void> {
    const transactionId = this.isRunning ? this.transactionId : undefined;
    this.isRunning = false;
    this.timers.forEach((timer) => clearInterval(timer));
    if (transactionId !== undefined && this.charger.isConnected) {
      await this.timed('StopTransaction', () =>
        this.messages.stopTransaction(transactionId, Math.round(this.energyWh), {
          reason: 'Local',
        }),
      );
    }
    await this.charger.close();
  }

  private async connect(): Promise<boolean> {
    const startedAt = performance.now();
    try {
      await this.charger.connect();
      this.context.stats.record('connect', performance.now() - startedAt);
      this.context.connections.opened += 1;
      return true;
    } catch (error) {
      this.context.stats.fail('connect');
      if (error instanceof ConnectRefused) {
        this.context.connections.refuse(error.status);
      } else {
        this.context.connections.error((error as Error).message);
      }
      return false;
    }
  }

  private async startSession(): Promise<void> {
    const { idTag } = this.context.options;
    const started = await this.timed('StartTransaction', () =>
      this.messages.startTransaction(LoadCharger.CONNECTOR_ID, idTag, Math.round(this.energyWh)),
    );
    if (started?.idTagInfo.status !== 'Accepted') {
      this.context.connections.error(
        `StartTransaction answered ${started?.idTagInfo.status ?? 'nothing'}`,
      );
      return;
    }
    this.transactionId = started.transactionId;
    await this.timed('StatusNotification', () =>
      this.messages.status(LoadCharger.CONNECTOR_ID, 'Charging'),
    );
  }

  private async sendMeterValues(): Promise<unknown> {
    const isCharging = this.transactionId !== undefined;
    if (isCharging) {
      this.energyWh += (LoadCharger.POWER_W * this.context.options.meterS) / 3_600;
    }
    return this.timed('MeterValues', () =>
      this.messages.meterValues(
        LoadCharger.CONNECTOR_ID,
        this.transactionId,
        Math.round(this.energyWh),
        isCharging ? LoadCharger.POWER_W : 0,
      ),
    );
  }

  /** Runs `send` every `seconds`; a charger the server dropped is counted once and goes quiet. */
  private every(seconds: number, send: () => Promise<unknown>): void {
    const timer = setInterval(() => {
      if (!this.isRunning) {
        return;
      }
      if (!this.charger.isConnected) {
        this.isRunning = false;
        this.context.connections.dropped += 1;
        return;
      }
      void send();
    }, seconds * 1_000);
    this.timers.push(timer);
  }

  /** The call's answer, or undefined when it failed; either way it is counted. */
  private async timed<T>(action: string, call: () => Promise<T>): Promise<T | undefined> {
    const startedAt = performance.now();
    try {
      const result = await call();
      this.context.stats.record(action, performance.now() - startedAt);
      return result;
    } catch {
      this.context.stats.fail(action);
      return undefined;
    }
  }
}
