import { SimulatedCharger } from '@wattwisely/charger-sim';
import { ConnectorState } from './connector-state';
import { SimOptions } from './sim-options';

/** How the demo charger answers the platform's commands: accept, then act a moment later like a real one. */
export class CommandAnswers {
  static readonly ACT_AFTER_MS = 500;

  constructor(
    private readonly options: SimOptions,
    private readonly connectors: ConnectorState[],
    private readonly log: (line: string) => void,
  ) {}

  install(charger: SimulatedCharger, onReset: () => Promise<void>): void {
    charger.on('RemoteStartTransaction', (payload) =>
      this.remoteStart(payload as { connectorId?: number; idTag: string }),
    );
    charger.on('RemoteStopTransaction', (payload) =>
      this.remoteStop(payload as { transactionId: number }),
    );
    charger.on('UnlockConnector', () => ({ status: 'Unlocked' }));
    charger.on('ChangeAvailability', (payload) =>
      this.changeAvailability(payload as { connectorId: number; type: string }),
    );
    charger.on('Reset', (payload) => {
      this.log(`reset (${(payload as { type: string }).type}) accepted`);
      setTimeout(() => void onReset(), CommandAnswers.ACT_AFTER_MS);
      return { status: 'Accepted' };
    });
  }

  private remoteStart(payload: { connectorId?: number; idTag: string }): { status: string } {
    const connector = this.find(payload.connectorId ?? 1);
    if (!connector || connector.isCharging || connector.status === 'Unavailable') {
      return { status: 'Rejected' };
    }
    this.later(() =>
      connector.startCharging(payload.idTag, this.options.powerW, this.options.meterIntervalS),
    );
    return { status: 'Accepted' };
  }

  private remoteStop(payload: { transactionId: number }): { status: string } {
    const connector = this.connectors.find(
      (candidate) => candidate.transactionId === payload.transactionId,
    );
    if (!connector) {
      return { status: 'Rejected' };
    }
    this.later(() => connector.stopCharging('Remote'));
    return { status: 'Accepted' };
  }

  private changeAvailability(payload: { connectorId: number; type: string }): { status: string } {
    const targets = payload.connectorId === 0 ? this.connectors : [this.find(payload.connectorId)];
    if (targets.some((connector) => !connector)) {
      return { status: 'Rejected' };
    }
    const status = payload.type === 'Inoperative' ? 'Unavailable' : 'Available';
    this.later(async () => {
      for (const connector of targets as ConnectorState[]) {
        await connector.setStatus(status);
      }
    });
    return { status: 'Accepted' };
  }

  private find(connectorId: number): ConnectorState | undefined {
    return this.connectors.find((connector) => connector.id === connectorId);
  }

  private later(work: () => Promise<void>): void {
    setTimeout(() => {
      work().catch((error: Error) => this.log(`command failed: ${error.message}`));
    }, CommandAnswers.ACT_AFTER_MS);
  }
}
