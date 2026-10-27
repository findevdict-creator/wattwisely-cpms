import { ConnectorState } from './connector-state';
import { SimOptions } from './sim-options';

/** A command's answer: the status word both versions use (Accepted, Rejected, …). */
export interface CommandAnswer {
  status: string;
}

/**
 * How the demo charger answers the platform's commands, whatever the OCPP version they
 * arrived in: accept, then act a moment later like a real one. The dialect turns each
 * version's actions and payloads into these calls.
 */
export class CommandAnswers {
  static readonly ACT_AFTER_MS = 500;

  constructor(
    private readonly options: SimOptions,
    private readonly connectors: ConnectorState[],
    private readonly log: (line: string) => void,
    private readonly onReset: () => Promise<void>,
  ) {}

  remoteStart(connectorId: number, idTag: string): CommandAnswer {
    const connector = this.find(connectorId);
    if (!connector || connector.isCharging || connector.status === 'Unavailable') {
      return { status: 'Rejected' };
    }
    this.later(() =>
      connector.startCharging(idTag, this.options.powerW, this.options.meterIntervalS),
    );
    return { status: 'Accepted' };
  }

  remoteStop(transactionId: string): CommandAnswer {
    const connector = this.connectors.find(
      (candidate) => candidate.transactionId === transactionId,
    );
    if (!connector) {
      return { status: 'Rejected' };
    }
    this.later(() => connector.stopCharging('Remote'));
    return { status: 'Accepted' };
  }

  /** Connector 0 (1.6) or no EVSE (2.0.1) means the whole station. */
  changeAvailability(connectorId: number, isOperative: boolean): CommandAnswer {
    const targets = connectorId === 0 ? this.connectors : [this.find(connectorId)];
    if (targets.some((connector) => !connector)) {
      return { status: 'Rejected' };
    }
    const status = isOperative ? 'Available' : 'Unavailable';
    this.later(async () => {
      for (const connector of targets as ConnectorState[]) {
        await connector.setStatus(status);
      }
    });
    return { status: 'Accepted' };
  }

  /** A real charger would hold the cap; the demo one only reports it. */
  setChargingProfile(limitW: number | undefined): CommandAnswer {
    this.log(`power cap set to ${limitW ?? '?'} W`);
    return { status: 'Accepted' };
  }

  clearChargingProfile(): CommandAnswer {
    this.log('power cap removed');
    return { status: 'Accepted' };
  }

  reset(type: string): CommandAnswer {
    this.log(`reset (${type}) accepted`);
    setTimeout(() => void this.onReset(), CommandAnswers.ACT_AFTER_MS);
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
