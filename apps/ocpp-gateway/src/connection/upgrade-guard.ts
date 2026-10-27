import { Injectable } from '@nestjs/common';
import { AcceptedUpgrade } from './accepted-upgrade';
import { ChargerExistsCheck } from './checks/charger-exists.check';
import { DuplicateConnectionCheck } from './checks/duplicate-connection.check';
import { RequestChecks } from './request-checks';
import { UpgradeRequest } from './upgrade-request';

/**
 * Runs the upgrade checks in order, before any OCPP message (OCPP gateway design,
 * "Connection lifecycle"): rate limit, charger exists, transport, version, auth,
 * duplicate. The first failing check decides the HTTP answer.
 */
@Injectable()
export class UpgradeGuard {
  constructor(
    private readonly exists: ChargerExistsCheck,
    private readonly checks: RequestChecks,
    private readonly duplicate: DuplicateConnectionCheck,
  ) {}

  async check(request: UpgradeRequest): Promise<AcceptedUpgrade> {
    this.checks.countAttempt(request);
    const charger = await this.exists.find(request);
    const version = this.checks.run(request, charger);
    const connectionId = await this.duplicate.check(charger, { remoteIp: request.ip, version });
    return { charger, connectionId, remoteIp: request.ip, version };
  }
}
