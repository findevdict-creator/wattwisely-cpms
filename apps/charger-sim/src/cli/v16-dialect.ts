import { ChargerMessages, SimulatedCharger } from '@wattwisely/charger-sim';
import { CommandAnswers } from './command-answers';
import { BootAnswer, StationDialect, TransactionStart } from './station-dialect';

/** OCPP 1.6J as the demo charger speaks it. */
export class V16Dialect implements StationDialect {
  static readonly PROTOCOLS = ['ocpp1.6'];

  readonly protocols = V16Dialect.PROTOCOLS;

  private readonly messages: ChargerMessages;

  constructor(charger: SimulatedCharger) {
    this.messages = new ChargerMessages(charger);
  }

  boot(): Promise<BootAnswer> {
    return this.messages.boot();
  }

  heartbeat(): Promise<unknown> {
    return this.messages.heartbeat();
  }

  async announceStation(): Promise<void> {
    await this.messages.status(0, 'Available');
  }

  async connectorStatus(connectorId: number, status: string): Promise<void> {
    await this.messages.status(connectorId, status);
  }

  async authorize(idTag: string): Promise<string> {
    const answer = await this.messages.authorize(idTag);
    return answer.idTagInfo.status;
  }

  async startTransaction(
    connectorId: number,
    idTag: string,
    meterWh: number,
  ): Promise<TransactionStart> {
    const started = await this.messages.startTransaction(connectorId, idTag, meterWh);
    return { transactionId: String(started.transactionId), tokenStatus: started.idTagInfo.status };
  }

  async meterValues(
    connectorId: number,
    transactionId: string,
    meterWh: number,
    powerW: number,
  ): Promise<void> {
    await this.messages.meterValues(connectorId, Number(transactionId), meterWh, powerW);
  }

  async stopTransaction(
    _connectorId: number,
    transactionId: string,
    meterWh: number,
    reason: string,
  ): Promise<void> {
    await this.messages.stopTransaction(Number(transactionId), meterWh, { reason });
  }

  installCommands(charger: SimulatedCharger, answers: CommandAnswers): void {
    charger.on('RemoteStartTransaction', (payload) => {
      const { connectorId, idTag } = payload as { connectorId?: number; idTag: string };
      return answers.remoteStart(connectorId ?? 1, idTag);
    });
    charger.on('RemoteStopTransaction', (payload) =>
      answers.remoteStop(String((payload as { transactionId: number }).transactionId)),
    );
    charger.on('UnlockConnector', () => ({ status: 'Unlocked' }));
    charger.on('ChangeAvailability', (payload) => {
      const { connectorId, type } = payload as { connectorId: number; type: string };
      return answers.changeAvailability(connectorId, type === 'Operative');
    });
    charger.on('SetChargingProfile', (payload) => {
      const profile = payload as {
        csChargingProfiles?: {
          chargingSchedule?: { chargingSchedulePeriod?: { limit?: number }[] };
        };
      };
      return answers.setChargingProfile(
        profile.csChargingProfiles?.chargingSchedule?.chargingSchedulePeriod?.[0]?.limit,
      );
    });
    charger.on('ClearChargingProfile', () => answers.clearChargingProfile());
    charger.on('Reset', (payload) => answers.reset((payload as { type: string }).type));
  }
}
