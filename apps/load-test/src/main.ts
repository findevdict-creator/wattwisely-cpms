import { LoadOptions } from './cli/load-options';
import { LoadRun } from './load/load-run';

let options: LoadOptions | null;
try {
  options = LoadOptions.parse(process.argv.slice(2));
} catch (error) {
  process.stderr.write(`${(error as Error).message}\n\n${LoadOptions.USAGE}\n`);
  process.exit(2);
}
if (!options) {
  process.stdout.write(`${LoadOptions.USAGE}\n`);
  process.exit(0);
}
const run = new LoadRun(options, (line) => process.stdout.write(`${line}\n`));
process.on('SIGINT', () => run.stop());
process.on('SIGTERM', () => run.stop());
void run.run().then((report) => process.exit(report.isPassed ? 0 : 1));
