import { randomUUID } from 'node:crypto';
import { ChargerMessages201, SimulatedCharger } from '@wattwisely/charger-sim';
import { CommandAnswers } from './command-answers';
import { BootAnswer, StationDialect, TransactionStart } from './station-dialect';

/**
 * OCPP 2.0.1 as the demo charger speaks it. Each connector is an EVSE with one cable; a
 * connector's finer states (Preparing, Charging, Finishing) travel as the transaction's
 * charging state, since 2.0.1's StatusNotification only says whether a cable is in use.
 */
export class V201Dialect implements StationDialect {
  /** 1.6's connector status words in 2.0.1's five. */
  static readonly STATUS_WORDS: Record<string, string> = {
    Available: 'Available',
    Unavailable: 'Unavailable',
    Faulted: 'Faulted',
    Reserved: 'Reserved',
  };

  static readonly PROTOCOLS = ChargerMessages201.PROTOCOLS;

  readonly protocols = V201Dialect.PROTOCOLS;

  private readonly messages: ChargerMessages201;

  constructor(charger: SimulatedCharger) {
    this.messages = new ChargerMessages201(charger);
  }

  static statusWord(status: string): string {
    return V201Dialect.STATUS_WORDS[status] ?? 'Occupied';
  }

  boot(): Promise<BootAnswer> {
    return this.messages.boot();
  }

  heartbeat(): Promise<unknown> {
    return this.messages.heartbeat();
  }

  /** A 2.0.1 station has no connector 0: there is nothing to announce beyond the boot. */
  announceStation(): Promise<void> {
    return Promise.resolve();
  }

  async connectorStatus(connectorId: number, status: string): Promise<void> {
    await this.messages.status(connectorId, V201Dialect.statusWord(status));
  }

  async authorize(idTag: string): Promise<string> {
    const answer = await this.messages.authorize(idTag);
    return answer.idTokenInfo.status;
  }

  /** Started with the cable in, then Updated once the car draws power. */
  async startTransaction(
    connectorId: number,
    idTag: string,
    meterWh: number,
  ): Promise<TransactionStart> {
    const transactionId = randomUUID();
    const started = await this.messages.transactionStarted(transactionId, {
      evseId: connectorId,
      idToken: idTag,
      meterWh,
    });
    await this.messages.transactionUpdated(transactionId, {
      evseId: connectorId,
      chargingState: 'Charging',
      triggerReason: 'ChargingStateChanged',
    });
    return { transactionId, tokenStatus: started.idTokenInfo?.status ?? 'Accepted' };
  }

  async meterValues(
    connectorId: number,
    transactionId: string,
    meterWh: number,
    powerW: number,
  ): Promise<void> {
    await this.messages.transactionUpdated(transactionId, {
      evseId: connectorId,
      meterWh,
      powerW,
      chargingState: 'Charging',
    });
  }

  async stopTransaction(
    connectorId: number,
    transactionId: string,
    meterWh: number,
    reason: string,
  ): Promise<void> {
    await this.messages.transactionEnded(transactionId, {
      evseId: connectorId,
      meterWh,
      chargingState: 'EVConnected',
      stoppedReason: reason,
    });
  }

  installCommands(charger: SimulatedCharger, answers: CommandAnswers): void {
    charger.on('RequestStartTransaction', (payload) => {
      const { evseId, idToken } = payload as { evseId?: number; idToken: { idToken: string } };
      return answers.remoteStart(evseId ?? 1, idToken.idToken);
    });
    charger.on('RequestStopTransaction', (payload) =>
      answers.remoteStop((payload as { transactionId: string }).transactionId),
    );
    charger.on('UnlockConnector', () => ({ status: 'Unlocked' }));
    charger.on('ChangeAvailability', (payload) => {
      const { operationalStatus, evse } = payload as {
        operationalStatus: string;
        evse?: { id: number };
      };
      return answers.changeAvailability(evse?.id ?? 0, operationalStatus === 'Operative');
    });
    charger.on('SetChargingProfile', (payload) => {
      const { chargingProfile } = payload as {
        chargingProfile?: {
          chargingSchedule?: { chargingSchedulePeriod?: { limit?: number }[] }[];
        };
      };
      return answers.setChargingProfile(
        chargingProfile?.chargingSchedule?.[0]?.chargingSchedulePeriod?.[0]?.limit,
      );
    });
    charger.on('ClearChargingProfile', () => answers.clearChargingProfile());
    charger.on('Reset', (payload) => answers.reset((payload as { type: string }).type));
  }
}
