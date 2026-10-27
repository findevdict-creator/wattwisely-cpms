import { LoadOptions } from './load-options';

describe('LoadOptions', () => {
  it('has defaults for a 100-charger run against a local gateway', () => {
    expect(LoadOptions.parse([])).toMatchObject({
      url: 'ws://localhost:3100/ocpp',
      prefix: 'LOAD',
      count: 100,
      rampS: 60,
      durationS: 300,
      isStartingSessions: false,
      maxP95Ms: 2_000,
      maxErrorRate: 0.01,
    });
  });

  it('reads every flag; --max-errors is a percentage', () => {
    const options = LoadOptions.parse([
      '--url=wss://ocpp.example.com/ocpp',
      '--prefix=STAGE',
      '--count=1000',
      '--ramp=120',
      '--duration=0.5',
      '--heartbeat=30',
      '--meter=15',
      '--sessions',
      '--id-tag=BENCH',
      '--password=secret',
      '--max-p95=500',
      '--max-errors=2.5',
    ]);

    expect(options).toMatchObject({
      url: 'wss://ocpp.example.com/ocpp',
      prefix: 'STAGE',
      count: 1000,
      rampS: 120,
      durationS: 0.5,
      heartbeatS: 30,
      meterS: 15,
      isStartingSessions: true,
      idTag: 'BENCH',
      password: 'secret',
      maxP95Ms: 500,
      maxErrorRate: 0.025,
    });
  });

  it('returns null for --help', () => {
    expect(LoadOptions.parse(['--help'])).toBeNull();
  });

  it('refuses values that make no sense, naming the flag', () => {
    expect(() => LoadOptions.parse(['--count=0'])).toThrow(
      '--count must be a number from 1 to 10000',
    );
    expect(() => LoadOptions.parse(['--count=lots'])).toThrow('not "lots"');
    expect(() => LoadOptions.parse(['--max-errors=150'])).toThrow('--max-errors');
    expect(() => LoadOptions.parse(['--url=http://localhost:3100'])).toThrow('ws:// or wss://');
    expect(() => LoadOptions.parse(['--chargers=5'])).toThrow();
  });

  it('names chargers the way the seed script registers them', () => {
    expect(LoadOptions.identity('LOAD', 7)).toBe('LOAD-0007');
    expect(LoadOptions.identity('LOAD', 1234)).toBe('LOAD-1234');
  });
});
