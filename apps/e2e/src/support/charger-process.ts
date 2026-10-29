import { ChildProcess, spawn } from 'node:child_process';
import { join } from 'node:path';
import { StackUrls } from './stack-urls';

/**
 * The demo charger of `npm run sim` (apps/charger-sim) as a separate process: it boots, keeps
 * its heartbeat, answers remote start and stop from the portal and the apps, and meters energy
 * while charging, as a real charger on a site would.
 */
export class ChargerProcess {
  static readonly MAIN = join(__dirname, '../../../../dist/apps/charger-sim/main.js');

  private process: ChildProcess | null = null;
  private output = '';

  constructor(
    private readonly identity: string,
    private readonly extraArgs: string[] = [],
  ) {}

  async start(): Promise<void> {
    const args = [
      ChargerProcess.MAIN,
      '--url',
      StackUrls.OCPP,
      '--identity',
      this.identity,
      '--meter',
      '2',
      ...this.extraArgs,
    ];
    this.process = spawn(process.execPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    this.process.stdout?.on('data', (chunk: Buffer) => (this.output += chunk.toString()));
    this.process.stderr?.on('data', (chunk: Buffer) => (this.output += chunk.toString()));
    await this.waitForLog(/boot|Accepted|accepted/i, 20_000);
  }

  async stop(): Promise<void> {
    if (this.process && this.process.exitCode === null) {
      this.process.kill('SIGINT');
      await new Promise((resolve) => setTimeout(resolve, 500));
      this.process.kill('SIGKILL');
    }
    this.process = null;
  }

  get log(): string {
    return this.output;
  }

  async waitForLog(pattern: RegExp, timeoutMs = 30_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (!pattern.test(this.output)) {
      if (Date.now() > deadline) {
        throw new Error(
          `The simulator did not log ${pattern} within ${timeoutMs} ms:\n${this.output}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}
