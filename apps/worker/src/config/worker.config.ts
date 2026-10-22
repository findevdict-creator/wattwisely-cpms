import { IsInt, IsUrl, Max, Min } from 'class-validator';

/**
 * Typed settings for the worker, read from environment variables at startup and
 * validated, so a wrong setting stops the worker at boot. The intervals come from the
 * Sessions and Pricing design; tests make them long and run the jobs by hand.
 */
export class WorkerConfig {
  @IsInt()
  @Min(1)
  @Max(65535)
  port!: number;

  /** Postgres, as the wattwisely_app role: the same connection the API and the gateway use. */
  @IsUrl({ require_tld: false, protocols: ['postgres', 'postgresql'] })
  databaseUrl!: string;

  /** How often stopped sessions are checked for their final price. */
  @IsInt()
  @Min(100)
  finaliseIntervalMs!: number;

  /** How often the running cost of charging sessions is updated. */
  @IsInt()
  @Min(100)
  liveCostIntervalMs!: number;

  /** How often sessions that went silent for a day are closed. */
  @IsInt()
  @Min(100)
  staleSweepIntervalMs!: number;
}
