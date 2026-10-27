import { SimulatedCharger } from './simulated-charger';

/** What a simulated 2.0.1 transaction event says besides its type and transaction id. */
export interface TransactionEventDetails {
  evseId?: number;
  idToken?: string;
  /** The energy register in Wh, sent as a sampled value; left out when undefined. */
  meterWh?: number;
  powerW?: number;
  chargingState?: string;
  triggerReason?: string;
  stoppedReason?: string;
  at?: Date;
}

/** The OCPP 2.0.1 messages a charging station sends, with sensible defaults, as calls on a simulated charger. */
export class ChargerMessages201 {
  static readonly PROTOCOLS = ['ocpp2.0.1'];

  private seqNo = 0;

  constructor(private readonly charger: SimulatedCharger) {}

  boot(overrides: Record<string, unknown> = {}) {
    const options = this.charger.options;
    return this.charger.callForResult<{ status: string; interval: number; currentTime: string }>(
      'BootNotification',
      {
        reason: 'PowerUp',
        chargingStation: {
          vendorName: options.vendor ?? 'Wattwisely',
          model: options.model ?? 'Simulator',
          ...(options.serial ? { serialNumber: options.serial } : {}),
          firmwareVersion: options.firmwareVersion ?? '2.0.0',
        },
        ...overrides,
      },
    );
  }

  heartbeat() {
    return this.charger.callForResult<{ currentTime: string }>('Heartbeat', {});
  }

  status(evseId: number, connectorStatus: string, connectorId = 1, at = new Date()) {
    return this.charger.callForResult('StatusNotification', {
      timestamp: at.toISOString(),
      connectorStatus,
      evseId,
      connectorId,
    });
  }

  authorize(idToken: string, type = 'ISO14443') {
    return this.charger.callForResult<{ idTokenInfo: { status: string } }>('Authorize', {
      idToken: { idToken, type },
    });
  }

  transactionStarted(transactionId: string, details: TransactionEventDetails = {}) {
    return this.transactionEvent('Started', transactionId, {
      triggerReason: 'CablePluggedIn',
      chargingState: 'EVConnected',
      ...details,
    });
  }

  transactionUpdated(transactionId: string, details: TransactionEventDetails = {}) {
    return this.transactionEvent('Updated', transactionId, {
      triggerReason: 'MeterValuePeriodic',
      ...details,
    });
  }

  transactionEnded(transactionId: string, details: TransactionEventDetails = {}) {
    return this.transactionEvent('Ended', transactionId, {
      triggerReason: 'EVDeparted',
      stoppedReason: 'EVDisconnected',
      chargingState: 'Idle',
      ...details,
    });
  }

  securityEvent(type: string) {
    return this.charger.callForResult('SecurityEventNotification', {
      type,
      timestamp: new Date().toISOString(),
    });
  }

  private transactionEvent(
    eventType: string,
    transactionId: string,
    details: TransactionEventDetails,
  ) {
    const at = details.at ?? new Date();
    this.seqNo += 1;
    return this.charger.callForResult<{ idTokenInfo?: { status: string } }>('TransactionEvent', {
      eventType,
      timestamp: at.toISOString(),
      triggerReason: details.triggerReason ?? 'Trigger',
      seqNo: this.seqNo,
      transactionInfo: {
        transactionId,
        ...(details.chargingState ? { chargingState: details.chargingState } : {}),
        ...(details.stoppedReason ? { stoppedReason: details.stoppedReason } : {}),
      },
      evse: { id: details.evseId ?? 1, connectorId: 1 },
      ...(details.idToken ? { idToken: { idToken: details.idToken, type: 'ISO14443' } } : {}),
      ...ChargerMessages201.meterValue(details, at),
    });
  }

  /** One energy sample in Wh (the spec's default measurand and unit) and, when given, a power sample in W. */
  private static meterValue(details: TransactionEventDetails, at: Date): object {
    if (details.meterWh === undefined) {
      return {};
    }
    const sampledValue = [
      { value: details.meterWh, context: 'Sample.Periodic' },
      ...(details.powerW === undefined
        ? []
        : [
            {
              value: details.powerW,
              measurand: 'Power.Active.Import',
              unitOfMeasure: { unit: 'W' },
            },
          ]),
    ];
    return { meterValue: [{ timestamp: at.toISOString(), sampledValue }] };
  }
}
