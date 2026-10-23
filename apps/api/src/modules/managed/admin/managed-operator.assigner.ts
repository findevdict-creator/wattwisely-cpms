import { Injectable } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { membershipRoles, tenantMemberships, Transaction, UuidV7 } from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { ManagedOperatorRole } from '../../../common/managed/managed-operator-role';
import { RequestAuth } from '../../../common/request/request-auth';
import { ManagedOperatorDto } from '../dto/managed-operator.dto';
import { ManagedOperatorsRepository } from '../managed-operators.repository';
import { ManagedServiceErrors } from '../managed-service-errors';
import { ManagedOperatorRecord, ManagedServiceRecord } from '../managed-service-record';
import { AccountManagerRecord, ManagedServicesRepository } from '../managed-services.repository';

/** Who to make a Managed operator, and where. */
export interface OperatorAssignment {
  staff: AccountManagerRecord;
  siteIds: string[];
}

/**
 * Puts Wattwisely staff into a tenant as its Managed operator and takes them out again
 * (story MGT-02): an active membership carrying the role, and the assignment row that
 * remembers it. Runs inside a platform transaction that works in the tenant.
 */
@Injectable()
export class ManagedOperatorAssigner {
  constructor(
    private readonly operators: ManagedOperatorsRepository,
    private readonly services: ManagedServicesRepository,
    private readonly audit: AuditRecorder,
  ) {}

  /** The staff working in the tenant now. */
  current(tx: Transaction, tenantId: string): Promise<ManagedOperatorRecord[]> {
    return this.operators.findActive(tx, tenantId);
  }

  /** Every tenant one person works in (platform access only). */
  assignmentsOf(tx: Transaction, userAccountId: string): Promise<ManagedOperatorRecord[]> {
    return this.operators.findActiveByAccount(tx, userAccountId);
  }

  /** A current staff member by their platform_staff id, or 422. */
  async requireStaff(tx: Transaction, staffId: string): Promise<AccountManagerRecord> {
    const staff = UuidV7.isUuid(staffId)
      ? await this.services.findAccountManager(tx, staffId)
      : null;
    if (!staff) {
      throw ManagedServiceErrors.staffNotFound();
    }
    return staff;
  }

  async assign(
    tx: Transaction,
    auth: RequestAuth,
    service: ManagedServiceRecord,
    assignment: OperatorAssignment,
  ): Promise<ManagedOperatorRecord> {
    const membershipId = await this.membershipFor(tx, service.tenantId, assignment.staff);
    await this.replaceRoles(
      tx,
      auth,
      { tenantId: service.tenantId, membershipId },
      assignment.siteIds,
    );
    const id = await this.operators.insert(tx, {
      tenantId: service.tenantId,
      managedServiceId: service.id,
      userAccountId: assignment.staff.userAccountId,
      membershipId,
      assignedBy: auth.requireAccount().id,
    });
    const operators = await this.current(tx, service.tenantId);
    const record = operators.find((operator) => operator.id === id) as ManagedOperatorRecord;
    await this.record(tx, auth, {
      what: 'assigned',
      operator: record,
      siteIds: assignment.siteIds,
    });
    return record;
  }

  /** Ends the operator's membership and roles; the assignment row keeps the history. */
  async remove(tx: Transaction, auth: RequestAuth, operator: ManagedOperatorRecord) {
    const removedBy = auth.requireAccount().id;
    await tx
      .update(tenantMemberships)
      .set({ status: 'removed', removedAt: new Date(), removedBy, updatedAt: new Date() })
      .where(eq(tenantMemberships.id, operator.membershipId));
    await tx.delete(membershipRoles).where(eq(membershipRoles.membershipId, operator.membershipId));
    await this.operators.markRemoved(tx, operator.id, removedBy);
    await this.record(tx, auth, { what: 'removed', operator });
  }

  /** The membership to carry the role: a new one, or the person's old row brought back. */
  private async membershipFor(tx: Transaction, tenantId: string, staff: AccountManagerRecord) {
    const [existing] = await tx
      .select({ id: tenantMemberships.id, status: tenantMemberships.status })
      .from(tenantMemberships)
      .where(
        and(
          eq(tenantMemberships.tenantId, tenantId),
          eq(tenantMemberships.userAccountId, staff.userAccountId),
        ),
      );
    if (existing?.status === 'active') {
      throw ManagedServiceErrors.alreadyMember();
    }
    const joined = {
      status: 'active' as const,
      joinedAt: new Date(),
      removedAt: null,
      removedBy: null,
    };
    if (existing) {
      await tx
        .update(tenantMemberships)
        .set({ ...joined, inviteTokenHash: null, updatedAt: new Date() })
        .where(eq(tenantMemberships.id, existing.id));
      return existing.id;
    }
    return this.insertMembership(tx, { tenantId, userAccountId: staff.userAccountId, ...joined });
  }

  private async insertMembership(
    tx: Transaction,
    row: Omit<typeof tenantMemberships.$inferInsert, 'id'>,
  ) {
    const id = UuidV7.create();
    await tx.insert(tenantMemberships).values({ id, ...row });
    return id;
  }

  private async replaceRoles(
    tx: Transaction,
    auth: RequestAuth,
    membership: { tenantId: string; membershipId: string },
    siteIds: string[],
  ): Promise<void> {
    await tx
      .delete(membershipRoles)
      .where(eq(membershipRoles.membershipId, membership.membershipId));
    const scopes = siteIds.length > 0 ? siteIds : [null];
    await tx.insert(membershipRoles).values(
      scopes.map((siteId) => ({
        id: UuidV7.create(),
        ...membership,
        roleId: ManagedOperatorRole.ID,
        siteId,
        createdBy: auth.requireAccount().id,
      })),
    );
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    change: { what: 'assigned' | 'removed'; operator: ManagedOperatorRecord; siteIds?: string[] },
  ): Promise<void> {
    const snapshot = new ManagedOperatorDto(change.operator);
    return this.audit.record(
      tx,
      auth,
      {
        action: `admin.managed_operator_${change.what}`,
        targetType: 'member',
        targetId: change.operator.membershipId,
        targetLabel: change.operator.email,
        before: change.what === 'removed' ? snapshot : null,
        after: change.what === 'assigned' ? { ...snapshot, site_ids: change.siteIds } : null,
      },
      change.operator.tenantId,
    );
  }
}
