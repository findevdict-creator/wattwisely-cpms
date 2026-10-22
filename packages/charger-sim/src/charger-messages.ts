import { SimulatedCharger } from './simulated-charger';

/** The OCPP 1.6 messages a charger sends, with sensible defaults, as calls on a simulated charger. */
export class ChargerMessages {
  constructor(private readonly charger: SimulatedCharger) {}

  boot(overrides: Record<string, unknown> = {}) {
    const options = this.charger.options;
    return this.charger.callForResult<{ status: string; interval: number; currentTime: string }>(
      'BootNotification',
      {
        chargePointVendor: options.vendor ?? 'Wattwisely',
        chargePointModel: options.model ?? 'Simulator',
        ...(options.serial ? { chargePointSerialNumber: options.serial } : {}),
        firmwareVersion: options.firmwareVersion ?? '1.0.0',
        ...overrides,
      },
    );
  }

  heartbeat() {
    return this.charger.callForResult<{ currentTime: string }>('Heartbeat', {});
  }

  status(connectorId: number, status: string, errorCode = 'NoError', info?: string) {
    return this.charger.callForResult('StatusNotification', {
      connectorId,
      status,
      errorCode,
      ...(info ? { info } : {}),
      timestamp: new Date().toISOString(),
    });
  }

  authorize(idTag: string) {
    return this.charger.callForResult<{ idTagInfo: { status: string } }>('Authorize', { idTag });
  }

  startTransaction(connectorId: number, idTag: string, meterStart: number, timestamp = new Date()) {
    return this.charger.callForResult<{ transactionId: number; idTagInfo: { status: string } }>(
      'StartTransaction',
      { connectorId, idTag, meterStart, timestamp: timestamp.toISOString() },
    );
  }

  stopTransaction(
    transactionId: number,
    meterStop: number,
    extra: { reason?: string; idTag?: string; transactionData?: unknown[] } = {},
  ) {
    return this.charger.callForResult('StopTransaction', {
      transactionId,
      meterStop,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  }

  /** One energy register sample (Wh) and, when given, a power sample (W). */
  meterValues(
    connectorId: number,
    transactionId: number | undefined,
    energyWh: number,
    powerW?: number,
  ) {
    const sampledValue = [
      { value: String(energyWh), measurand: 'Energy.Active.Import.Register', unit: 'Wh' },
      ...(powerW === undefined
        ? []
        : [{ value: String(powerW), measurand: 'Power.Active.Import', unit: 'W' }]),
    ];
    return this.charger.callForResult('MeterValues', {
      connectorId,
      ...(transactionId === undefined ? {} : { transactionId }),
      meterValue: [{ timestamp: new Date().toISOString(), sampledValue }],
    });
  }
}
