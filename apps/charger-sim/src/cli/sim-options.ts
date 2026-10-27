import { parseArgs } from 'node:util';

/** What `npm run sim -- ...` accepts. */
export class SimOptions {
  static readonly USAGE = [
    'Usage: npm run sim -- --identity <id> [--url ws://localhost:3100/ocpp] [--password <pw>]',
    '                      [--connectors 2] [--power 7400] [--vendor Wattwisely] [--model Simulator]',
    '                      [--serial <serial>] [--meter 10] [--tag <idTag>] [--ocpp 1.6|2.0.1]',
    '',
    'Simulates a charge point: boots, sends heartbeats and connector status, and answers',
    'remote start/stop, Reset, UnlockConnector and ChangeAvailability from the platform. It',
    'speaks OCPP 1.6J unless --ocpp 2.0.1 makes it a 2.0.1 charging station (one EVSE per',
    'connector).',
    'With --tag it holds that RFID card against connector 1 once booted: Authorize, then a',
    'charge when the platform accepts the card.',
  ].join('\n');

  url = 'ws://localhost:3100/ocpp';
  identity = '';
  password: string | undefined;
  connectors = 2;
  /** Charging power in W; the meter counts energy from it. */
  powerW = 7_400;
  vendor = 'Wattwisely';
  model = 'Simulator';
  serial: string | undefined;
  /** Seconds between MeterValues while charging. */
  meterIntervalS = 10;
  /** An RFID tag to present at connector 1 after booting. */
  tag: string | undefined;
  /** The OCPP version to offer the gateway. */
  ocpp: '1.6' | '2.0.1' = '1.6';

  static readonly FLAGS = {
    url: { type: 'string' },
    identity: { type: 'string' },
    password: { type: 'string' },
    connectors: { type: 'string' },
    power: { type: 'string' },
    vendor: { type: 'string' },
    model: { type: 'string' },
    serial: { type: 'string' },
    meter: { type: 'string' },
    tag: { type: 'string' },
    ocpp: { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  } as const;

  static parse(argv: string[]): SimOptions {
    const { values } = parseArgs({ args: argv, options: SimOptions.FLAGS });
    if (values.help || !values.identity) {
      process.stdout.write(`${SimOptions.USAGE}\n`);
      process.exit(values.help ? 0 : 2);
    }
    const options = new SimOptions();
    options.url = values.url ?? options.url;
    options.identity = values.identity;
    options.password = values.password;
    options.connectors = Number(values.connectors ?? options.connectors);
    options.powerW = Number(values.power ?? options.powerW);
    options.vendor = values.vendor ?? options.vendor;
    options.model = values.model ?? options.model;
    options.serial = values.serial;
    options.meterIntervalS = Number(values.meter ?? options.meterIntervalS);
    options.tag = values.tag;
    options.ocpp = SimOptions.versionOf(values.ocpp);
    return options;
  }

  private static versionOf(value: string | undefined): '1.6' | '2.0.1' {
    if (value === undefined || value === '1.6' || value === '2.0.1') {
      return value ?? '1.6';
    }
    process.stdout.write(`--ocpp must be 1.6 or 2.0.1, not ${value}\n`);
    process.exit(2);
  }
}
