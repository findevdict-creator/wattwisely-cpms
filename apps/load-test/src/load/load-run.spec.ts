import { LoadOptions } from '../cli/load-options';
import { FakeCentralSystem } from '../testing/fake-central-system';
import { LoadRun } from './load-run';

describe('LoadRun', () => {
  let server: FakeCentralSystem;
  let url: string;
  let printed: string[];

  beforeEach(async () => {
    server = new FakeCentralSystem();
    url = await server.start();
    printed = [];
  });

  afterEach(() => server.stop());

  const options = (overrides: Partial<LoadOptions> = {}) =>
    Object.assign(new LoadOptions(), {
      url,
      count: 4,
      rampS: 0.2,
      durationS: 0.6,
      heartbeatS: 0.1,
      meterS: 0.15,
      ...overrides,
    });

  it('connects every charger, keeps them talking, charges and reports a pass', async () => {
    const run = new LoadRun(options({ isStartingSessions: true }), (line) => printed.push(line));

    const report = await run.run();

    expect(run.connections.opened).toBe(4);
    expect(server.count('BootNotification')).toBe(4);
    expect(server.count('StartTransaction')).toBe(4);
    expect(server.count('StopTransaction')).toBe(4);
    expect(server.count('Heartbeat')).toBeGreaterThanOrEqual(8);
    expect(server.count('MeterValues')).toBeGreaterThanOrEqual(4);
    expect(report.overall.failed).toBe(0);
    expect(report.isPassed).toBe(true);
    expect(printed.join('\n')).toMatch(/Chargers connected: 4 of 4/);
    expect(printed.at(-1)).toMatch(/^PASSED: p95 \d+ ms \(limit 2000 ms\), 0.00% of calls failed/);
  });

  it('fails the run when a charger is refused, and says how', async () => {
    server.refused.add('LOAD-0002');
    const run = new LoadRun(options(), (line) => printed.push(line));

    const report = await run.run();

    expect(run.connections.opened).toBe(3);
    expect(run.connections.refused.get(404)).toBe(1);
    expect(report.isPassed).toBe(false);
    expect(printed).toContain('  refused with HTTP 404: 1');
    expect(printed.at(-1)).toMatch(/^FAILED/);
  });

  it('fails the run when the server drops chargers, and stops early when asked', async () => {
    const run = new LoadRun(options({ durationS: 30 }), (line) => printed.push(line));
    const finished = run.run();
    await new Promise((resolve) => setTimeout(resolve, 400));

    server.dropAll();
    await new Promise((resolve) => setTimeout(resolve, 300));
    run.stop();
    const report = await finished;

    expect(run.connections.dropped).toBe(4);
    expect(printed).toContain('  dropped by the server during the run: 4');
    expect(report.isPassed).toBe(false);
  });
});
