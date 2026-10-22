import { DemoCharger } from './cli/demo-charger';
import { SimOptions } from './cli/sim-options';

const options = SimOptions.parse(process.argv.slice(2));
const charger = new DemoCharger(options);
process.on('SIGINT', () => void charger.stop());
process.on('SIGTERM', () => void charger.stop());
void charger.run();
