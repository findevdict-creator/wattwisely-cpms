import { Injectable } from '@nestjs/common';
import { Transaction, UuidV7 } from '@wattwisely/db';
import { UserAccountsRepository } from '../../../common/account/user-accounts.repository';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { PlatformRole } from '../../../common/platform/platform-role-catalog';
import { RequestAuth } from '../../../common/request/request-auth';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { StaffMemberDto } from './dto/staff-member.dto';
import { PlatformStaffRepository, StaffRecord } from './platform-staff.repository';
import { StaffErrors } from './staff-errors';

/** A staff row before and after a change, for the audit log and the response. */
export interface StaffChange {
  before: StaffRecord | null;
  after: StaffRecord;
}

/** A staff row to change and the version the caller saw. */
export interface StaffTarget {
  id: string;
  version: number;
}

/** The database side of staff changes, inside the caller's platform transaction. */
@Injectable()
export class StaffWriter {
  constructor(
    private readonly staff: PlatformStaffRepository,
    private readonly accounts: UserAccountsRepository,
    private readonly audit: AuditRecorder,
  ) {}

  async add(
    tx: Transaction,
    auth: RequestAuth,
    email: string,
    role: PlatformRole,
  ): Promise<StaffChange> {
    const account = await this.accounts.findOrCreateByEmail(tx, email.trim());
    const existing = await this.staff.findByAccount(tx, account.id);
    if (existing && !existing.removedAt) {
      throw StaffErrors.alreadyStaff();
    }
    const grantedBy = auth.requireAccount().id;
    const id = existing
      ? await this.restore(tx, existing, role, grantedBy)
      : await this.staff.insert(tx, account.id, role, grantedBy);
    const after = (await this.staff.findById(tx, id)) as StaffRecord;
    await this.record(tx, auth, 'staff_added', { before: existing, after });
    return { before: existing, after };
  }

  async changeRole(
    tx: Transaction,
    auth: RequestAuth,
    target: StaffTarget,
    role: PlatformRole,
  ): Promise<StaffChange> {
    const before = await this.requireActive(tx, target.id);
    if (!(await this.staff.update(tx, before.id, target.version, { role }))) {
      throw VersionConflict.exception();
    }
    await this.ensureAdminRemains(tx);
    const after = (await this.staff.findById(tx, before.id)) as StaffRecord;
    await this.record(tx, auth, 'staff_role_changed', { before, after });
    return { before, after };
  }

  async remove(tx: Transaction, auth: RequestAuth, target: StaffTarget): Promise<StaffChange> {
    const before = await this.requireActive(tx, target.id);
    const changes = { removedAt: new Date(), removedBy: auth.requireAccount().id };
    if (!(await this.staff.update(tx, before.id, target.version, changes))) {
      throw VersionConflict.exception();
    }
    await this.ensureAdminRemains(tx);
    const after = (await this.staff.findById(tx, before.id)) as StaffRecord;
    await this.record(tx, auth, 'staff_removed', { before, after });
    return { before, after };
  }

  /** A removed person who comes back keeps their row (and its history). */
  private async restore(
    tx: Transaction,
    existing: StaffRecord,
    role: PlatformRole,
    grantedBy: string,
  ): Promise<string> {
    const changes = { role, grantedBy, removedAt: null, removedBy: null };
    if (!(await this.staff.update(tx, existing.id, existing.version, changes))) {
      throw VersionConflict.exception();
    }
    return existing.id;
  }

  private async requireActive(tx: Transaction, id: string): Promise<StaffRecord> {
    const record = UuidV7.isUuid(id) ? await this.staff.findById(tx, id) : null;
    if (!record || record.removedAt) {
      throw StaffErrors.notFound();
    }
    return record;
  }

  /** Checked after the change, inside the transaction: throwing undoes it. */
  private async ensureAdminRemains(tx: Transaction): Promise<void> {
    if ((await this.staff.countActive(tx, 'admin')) === 0) {
      throw StaffErrors.lastAdmin();
    }
  }

  private record(tx: Transaction, auth: RequestAuth, action: string, change: StaffChange) {
    return this.audit.record(
      tx,
      auth,
      {
        action: `admin.${action}`,
        targetType: 'platform_staff',
        targetId: change.after.id,
        targetLabel: change.after.email,
        before: change.before ? new StaffMemberDto(change.before) : null,
        after: new StaffMemberDto(change.after),
      },
      null,
    );
  }
}
