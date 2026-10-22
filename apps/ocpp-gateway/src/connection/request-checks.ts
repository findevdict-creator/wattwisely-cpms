import { Injectable } from '@nestjs/common';
import { ChargerIdentity } from '../storage/charger-identity';
import { ChargerAuthCheck } from './checks/charger-auth.check';
import { RateLimitCheck } from './checks/rate-limit.check';
import { TransportCheck } from './checks/transport.check';
import { VersionCheck } from './checks/version.check';
import { UpgradeRequest } from './upgrade-request';

/** The checks that need only the request and the charger record: rate limit, transport, version, auth. */
@Injectable()
export class RequestChecks {
  constructor(
    private readonly rateLimit: RateLimitCheck,
    private readonly transport: TransportCheck,
    private readonly version: VersionCheck,
    private readonly auth: ChargerAuthCheck,
  ) {}

  /** Counts the attempt before anything else, so unknown identities are rate limited too. */
  countAttempt(request: UpgradeRequest): void {
    this.rateLimit.check(request);
  }

  run(request: UpgradeRequest, charger: ChargerIdentity): void {
    this.transport.check(request, charger);
    this.version.check(request, charger);
    this.auth.check(request, charger);
  }
}
