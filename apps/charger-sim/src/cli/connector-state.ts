import { ChargerMessages } from '@wattwisely/charger-sim';

/** One connector of the demo charger: its status and, while charging, its transaction and meter. */
export class ConnectorState {
  status = 'Available';
  transactionId: number | null = null;
  meterWh = 0;
  private timer: NodeJS.Timeout | null = null;

  constructor(
    readonly id: number,
    private readonly messages: ChargerMessages,
    private readonly log: (line: string) => void,
  ) {}

  get isCharging(): boolean {
    return this.transactionId !== null;
  }

  async setStatus(status: string): Promise<void> {
    this.status = status;
    await this.messages.status(this.id, status);
    this.log(`connector ${this.id}: ${status}`);
  }

  /** Preparing → StartTransaction → Charging, then a meter reading every interval. */
  async startCharging(idTag: string, powerW: number, meterIntervalS: number): Promise<void> {
    if (this.isCharging) {
      return;
    }
    await this.setStatus('Preparing');
    const started = await this.messages.startTransaction(this.id, idTag, Math.round(this.meterWh));
    this.transactionId = started.transactionId;
    this.log(`transaction ${started.transactionId} started (${started.idTagInfo.status})`);
    await this.setStatus('Charging');
    this.timer = setInterval(() => void this.tick(powerW, meterIntervalS), meterIntervalS * 1000);
  }

  /** StopTransaction with the final meter reading, then Finishing → Available. */
  async stopCharging(reason: string): Promise<void> {
    const transactionId = this.transactionId;
    if (transactionId === null) {
      return;
    }
    this.clearTimer();
    this.transactionId = null;
    await this.messages.stopTransaction(transactionId, Math.round(this.meterWh), { reason });
    this.log(`transaction ${transactionId} stopped (${reason}) at ${Math.round(this.meterWh)} Wh`);
    await this.setStatus('Finishing');
    await this.setStatus('Available');
  }

  /** The connection dropped: keep the transaction, stop the meter until reconnected. */
  suspend(): void {
    this.clearTimer();
  }

  private async tick(powerW: number, meterIntervalS: number): Promise<void> {
    if (this.transactionId === null) {
      return;
    }
    this.meterWh += (powerW * meterIntervalS) / 3600;
    try {
      await this.messages.meterValues(
        this.id,
        this.transactionId,
        Math.round(this.meterWh),
        powerW,
      );
      this.log(`connector ${this.id}: ${Math.round(this.meterWh)} Wh`);
    } catch (error) {
      this.log(`meter values failed: ${(error as Error).message}`);
    }
  }

  private clearTimer(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }
}
