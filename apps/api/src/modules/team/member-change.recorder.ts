import { Injectable } from '@nestjs/common';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { Transaction } from '../../common/database/transaction-runner';
import { RequestAuth } from '../../common/request/request-auth';
import { MemberRoleDto } from './dto/member-role.dto';
import { MemberRecord } from './member-record';

/**
 * Writes team changes to the audit log, always with the member's e-mail and roles before and after.
 * `tenantId` is only needed where the request has no tenant yet (accepting an invitation).
 */
@Injectable()
export class MemberChangeRecorder {
  constructor(private readonly auditRecorder: AuditRecorder) {}

  async record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { before: MemberRecord | null; after: MemberRecord | null; tenantId?: string },
  ): Promise<void> {
    const member = (change.after ?? change.before) as MemberRecord;
    const tenantId = change.tenantId ?? auth.requireAccess().tenant.id;
    const entry = {
      action: `team.${action}`,
      targetType: 'member',
      targetId: member.id,
      targetLabel: member.email,
      before: MemberChangeRecorder.snapshot(change.before),
      after: MemberChangeRecorder.snapshot(change.after),
    };
    await this.auditRecorder.record(tx, auth, entry, tenantId);
  }

  private static snapshot(member: MemberRecord | null): object | null {
    if (!member) {
      return null;
    }
    return { status: member.status, roles: MemberRoleDto.fromGrants(member.grants) };
  }
}
