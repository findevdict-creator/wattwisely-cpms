import { IsBoolean, IsInt, Max, Min } from 'class-validator';
import { RateLimitPolicy } from '../common/rate-limit/rate-limit.decorator';

/**
 * Requests per client address and minute, per budget (module 12). The public budgets are
 * for the driver's page: its charge page polls every 3 seconds, and many phones can share
 * one address behind a mobile network, so they are generous; writes (start, stop, the
 * e-mail address) are tighter, as each start opens a card hold.
 */
export class RateLimits implements Record<RateLimitPolicy, number> {
  static readonly DEFAULT_PER_MINUTE = 1200;
  static readonly PUBLIC_PER_MINUTE = 300;
  static readonly PUBLIC_WRITE_PER_MINUTE = 30;

  @IsBoolean()
  isEnabled!: boolean;

  /** Every route with a login (RATE_LIMIT_PER_MINUTE). */
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  default!: number;

  /** Public reads: the driver's page, logos, an invitation (RATE_LIMIT_PUBLIC_PER_MINUTE). */
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  public!: number;

  /** Public writes: starting and stopping a charge, accepting an invitation (RATE_LIMIT_PUBLIC_WRITE_PER_MINUTE). */
  @IsInt()
  @Min(1)
  @Max(1_000_000)
  // eslint-disable-next-line @typescript-eslint/naming-convention -- the policy's name
  public_write!: number;
}
