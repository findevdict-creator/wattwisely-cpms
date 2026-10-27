import { parseArgs } from 'node:util';

type NumberFlag = 'count' | 'ramp' | 'duration' | 'heartbeat' | 'meter' | 'max-p95';
type NumberSetting = 'count' | 'rampS' | 'durationS' | 'heartbeatS' | 'meterS' | 'maxP95Ms';

/** What `npm run load-test -- ...` accepts. Throws with a readable message on a bad value. */
export class LoadOptions {
  static readonly USAGE = [
    'Usage: npm run load-test -- [--url ws://localhost:3100/ocpp] [--prefix LOAD] [--count 100]',
    '                            [--ramp 60] [--duration 300] [--heartbeat 60] [--meter 30]',
    '                            [--sessions] [--id-tag LOAD-TEST] [--password <pw>]',
    '                            [--max-p95 2000] [--max-errors 1]',
    '',
    'Connects --count simulated OCPP 1.6J chargers named <prefix>-0001, <prefix>-0002, ...',
    '(deploy/scripts/seed-load-test.sh registers them), spread over --ramp seconds. Each boots,',
    'reports its connector and sends a Heartbeat every --heartbeat and MeterValues every --meter',
    'seconds for --duration seconds. --sessions also starts a charge on every charger (the gateway',
    'needs OCPP_ACCEPT_UNKNOWN_ID_TAGS=true for the --id-tag). Prints the answer times by message',
    'and exits with 1 when the p95 exceeds --max-p95 ms or more than --max-errors % of calls fail.',
  ].join('\n');

  static readonly MAX_COUNT = 10_000;

  url = 'ws://localhost:3100/ocpp';
  prefix = 'LOAD';
  count = 100;
  /** Seconds over which the chargers connect, evenly spaced. */
  rampS = 60;
  /** Seconds the full load is held once every charger is connected. */
  durationS = 300;
  heartbeatS = 60;
  meterS = 30;
  isStartingSessions = false;
  idTag = 'LOAD-TEST';
  password: string | undefined;
  maxP95Ms = 2_000;
  /** Share of calls (0 to 1) allowed to fail or time out. */
  maxErrorRate = 0.01;

  static readonly FLAGS = {
    url: { type: 'string' },
    prefix: { type: 'string' },
    count: { type: 'string' },
    ramp: { type: 'string' },
    duration: { type: 'string' },
    heartbeat: { type: 'string' },
    meter: { type: 'string' },
    sessions: { type: 'boolean' },
    'id-tag': { type: 'string' },
    password: { type: 'string' },
    'max-p95': { type: 'string' },
    'max-errors': { type: 'string' },
    help: { type: 'boolean', short: 'h' },
  } as const;

  /** The flags that take a number: the setting each fills and the values it accepts. */
  static readonly NUMBER_FLAGS: { flag: NumberFlag; key: NumberSetting; range: number[] }[] = [
    { flag: 'count', key: 'count', range: [1, LoadOptions.MAX_COUNT] },
    { flag: 'ramp', key: 'rampS', range: [0, 86_400] },
    { flag: 'duration', key: 'durationS', range: [0.1, 86_400] },
    { flag: 'heartbeat', key: 'heartbeatS', range: [0.1, 86_400] },
    { flag: 'meter', key: 'meterS', range: [0.1, 86_400] },
    { flag: 'max-p95', key: 'maxP95Ms', range: [1, 600_000] },
  ];

  /** The identity of the n-th charger, counted from 1: LOAD-0001. The seed script uses the same names. */
  static identity(prefix: string, n: number): string {
    return `${prefix}-${String(n).padStart(4, '0')}`;
  }

  /** null when --help was asked for. */
  static parse(argv: string[]): LoadOptions | null {
    const { values } = parseArgs({ args: argv, options: LoadOptions.FLAGS, strict: true });
    if (values.help) {
      return null;
    }
    const options = new LoadOptions();
    options.url = values.url ?? options.url;
    options.prefix = values.prefix ?? options.prefix;
    options.isStartingSessions = values.sessions ?? false;
    options.idTag = values['id-tag'] ?? options.idTag;
    options.password = values.password;
    for (const { flag, key, range } of LoadOptions.NUMBER_FLAGS) {
      options[key] = LoadOptions.number(
        flag,
        values[flag] as string | undefined,
        options[key],
        range,
      );
    }
    const errorsPercent = LoadOptions.number('max-errors', values['max-errors'], 1, [0, 100]);
    options.maxErrorRate = errorsPercent / 100;
    LoadOptions.checkUrl(options.url);
    return options;
  }

  private static number(flag: string, text: string | undefined, fallback: number, range: number[]) {
    const value = text === undefined ? fallback : Number(text);
    if (!Number.isFinite(value) || value < range[0] || value > range[1]) {
      throw new Error(`--${flag} must be a number from ${range[0]} to ${range[1]}, not "${text}".`);
    }
    return value;
  }

  private static checkUrl(url: string): void {
    if (!/^wss?:\/\/[^\s/]+/.test(url)) {
      throw new Error(`--url must be a ws:// or wss:// address, not "${url}".`);
    }
  }
}
