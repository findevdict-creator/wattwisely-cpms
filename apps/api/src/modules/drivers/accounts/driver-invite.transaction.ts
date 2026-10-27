import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { RequestAuth } from '../../../common/request/request-auth';
import { DriverRecord } from '../profiles/driver-record';
import { DriverSnapshot } from '../profiles/driver-snapshot';
import { DriversService } from '../profiles/drivers.service';
import { DriverDetailDto } from '../profiles/dto/driver-detail.dto';

/** One change to a driver's login from the operator's side, and the audit action it is recorded as. */
export interface DriverInviteChange {
  auth: RequestAuth;
  driverId: string;
  action: string;
  work: (tx: Transaction, driver: DriverRecord) => Promise<void>;
}

/** What a change leaves behind: the record (for the e-mail) and the answer. */
export interface DriverInviteOutcome {
  driver: DriverRecord;
  detail: DriverDetailDto;
}

/**
 * Runs one operator-side change to a driver's login (module 19) as one transaction: checks
 * drivers:invite, loads the driver, applies the change, reads the driver again, writes the
 * audit entry with both states and answers with the detail the portal shows.
 */
@Injectable()
export class DriverInviteTransaction {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly reader: DriversService,
    private readonly audit: AuditRecorder,
  ) {}

  async run(change: DriverInviteChange): Promise<DriverInviteOutcome> {
    const access = change.auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'drivers:invite');
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const before = await this.reader.requireVisible(tx, change.driverId);
      await change.work(tx, before);
      const after = await this.reader.requireVisible(tx, before.id);
      await this.audit.record(tx, change.auth, {
        action: change.action,
        targetType: 'driver',
        targetId: after.id,
        targetLabel: after.name,
        before: DriverSnapshot.of(before),
        after: DriverSnapshot.of(after),
      });
      return { driver: after, detail: await this.reader.detail(tx, access, after.id) };
    });
  }
}
