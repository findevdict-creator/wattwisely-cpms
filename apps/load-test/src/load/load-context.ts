import { LoadOptions } from '../cli/load-options';
import { ConnectionTally } from './connection-tally';
import { LatencyStats } from './latency-stats';

/** What every simulated charger of a run shares: the settings and where it counts. */
export interface LoadContext {
  options: LoadOptions;
  stats: LatencyStats;
  connections: ConnectionTally;
}
