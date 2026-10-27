import { CustomDecorator, SetMetadata } from '@nestjs/common';

/** Which budget a route spends: see RateLimitGuard. */
export type RateLimitPolicy = 'default' | 'public' | 'public_write';

/**
 * Overrides the budget RateLimitGuard picks for a route (module 12), or takes the route
 * out of rate limiting altogether:
 *
 *   @RateLimit.policy('public_write')  e.g. a public GET that costs as much as a write
 *   @RateLimit.exempt()                health checks, metrics, the payment provider's webhooks
 */
export class RateLimit {
  static readonly POLICY_KEY = 'rate-limit:policy';
  static readonly EXEMPT = 'exempt';

  static policy(policy: RateLimitPolicy): CustomDecorator {
    return SetMetadata(RateLimit.POLICY_KEY, policy);
  }

  static exempt(): CustomDecorator {
    return SetMetadata(RateLimit.POLICY_KEY, RateLimit.EXEMPT);
  }
}
