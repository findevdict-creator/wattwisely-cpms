import { Injectable } from '@nestjs/common';
import { Transaction, UuidV7 } from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { RequestAuth } from '../../common/request/request-auth';
import { VersionConflict } from '../../common/problem/version-conflict';
import { ManagedServiceErrors } from './managed-service-errors';
import { ManagedServiceRecord, ManagedServiceRow } from './managed-service-record';
import { AccountManagerRecord, ManagedServicesRepository } from './managed-services.repository';
import { OfferManagedServiceRequestDto } from './dto/offer-managed-service-request.dto';
import { OwnOwnerChecker } from './tenant/own-owner.checker';

/** A change to an agreement: what changes, the reason for the log, and the version the caller saw. */
export interface ManagedServiceChange {
  /** The audit log action, e.g. "managed_service.accepted". */
  action: string;
  changes: Partial<ManagedServiceRow>;
  reason?: string;
  version: number;
}

/**
 * The database side of the agreement's life, inside the caller's transaction: every change
 * is checked against the status it needs and the version the caller saw, and written to
 * the audit log in the tenant. Used by the tenant's endpoints and the admin console's.
 */
@Injectable()
export class ManagedServiceWriter {
  constructor(
    private readonly services: ManagedServicesRepository,
    private readonly ownOwner: OwnOwnerChecker,
    private readonly audit: AuditRecorder,
  ) {}

  /** The Owner accepts (story MGT-01): the service starts. */
  accept(tx: Transaction, auth: RequestAuth, service: ManagedServiceRecord): Promise<void> {
    if (service.status !== 'pending_acceptance') {
      throw ManagedServiceErrors.wrongStatus('This agreement was already accepted.');
    }
    return this.apply(tx, auth, service, {
      action: 'managed_service.accepted',
      changes: { status: 'active', acceptedBy: auth.requireAccount().id, acceptedAt: new Date() },
      version: service.version,
    });
  }

  /** Either side gives notice (story MGT-05); the tenant must have an Owner of its own. */
  async giveNotice(
    tx: Transaction,
    auth: RequestAuth,
    service: ManagedServiceRecord,
    notice: { endsAt: Date; reason: string; version: number; action: string },
  ): Promise<void> {
    if (service.status !== 'active') {
      throw ManagedServiceErrors.wrongStatus('Notice can only be given on an active service.');
    }
    await this.ownOwner.require(tx, service.tenantId);
    await this.apply(tx, auth, service, {
      action: notice.action,
      changes: {
        status: 'ending',
        noticeGivenBy: auth.requireAccount().id,
        noticeGivenAt: new Date(),
        endsAt: notice.endsAt,
      },
      reason: notice.reason,
      version: notice.version,
    });
  }

  /** Wattwisely withdraws an offer the Owner has not accepted. */
  withdraw(tx: Transaction, auth: RequestAuth, service: ManagedServiceRecord, version: number) {
    if (service.status !== 'pending_acceptance') {
      throw ManagedServiceErrors.wrongStatus(
        'Only an agreement awaiting acceptance can be withdrawn. Give notice instead.',
      );
    }
    return this.apply(tx, auth, service, {
      action: 'admin.managed_service_withdrawn',
      changes: { status: 'withdrawn', endedAt: new Date() },
      version,
    });
  }

  /** Wattwisely changes the terms (account manager, approval rule, reference, notes). */
  update(
    tx: Transaction,
    auth: RequestAuth,
    service: ManagedServiceRecord,
    change: Omit<ManagedServiceChange, 'action'>,
  ) {
    return this.apply(tx, auth, service, { action: 'admin.managed_service_updated', ...change });
  }

  /** Wattwisely offers an agreement (story MGT-01): pending until the Owner accepts. */
  async offer(
    tx: Transaction,
    auth: RequestAuth,
    tenantId: string,
    terms: OfferManagedServiceRequestDto,
  ): Promise<{ record: ManagedServiceRecord; staff: AccountManagerRecord }> {
    if (await this.services.findLive(tx, tenantId)) {
      throw ManagedServiceErrors.alreadyOffered();
    }
    const staff = await this.requireStaff(tx, terms.account_manager_id);
    const id = UuidV7.create();
    await this.services.insert(tx, {
      id,
      tenantId,
      accountManagerId: staff.staffId,
      isTariffApprovalRequired: terms.is_tariff_approval_required ?? true,
      monthlyFee: terms.monthly_fee ?? 0,
      agreementReference: terms.agreement_reference?.trim() ?? '',
      notes: terms.notes?.trim() ?? '',
      offeredBy: auth.requireAccount().id,
    });
    const record = (await this.services.findById(tx, id)) as ManagedServiceRecord;
    await this.record(tx, auth, record, {
      action: 'admin.managed_service_offered',
      changes: { status: record.status, accountManagerId: staff.staffId },
    });
    return { record, staff };
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

  /** Writes the change if the row still has the version the caller saw, with its audit entry. */
  async apply(
    tx: Transaction,
    auth: RequestAuth,
    service: ManagedServiceRecord,
    change: ManagedServiceChange,
  ): Promise<void> {
    if (!(await this.services.update(tx, service.id, change.version, change.changes))) {
      throw VersionConflict.exception();
    }
    await this.record(tx, auth, service, change);
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    service: ManagedServiceRecord,
    change: Omit<ManagedServiceChange, 'version'>,
  ): Promise<void> {
    return this.audit.record(
      tx,
      auth,
      {
        action: change.action,
        targetType: 'managed_service',
        targetId: service.id,
        targetLabel: service.agreementReference || undefined,
        before: { status: service.status },
        after: { ...ManagedServiceWriter.snapshot(change.changes), reason: change.reason },
      },
      service.tenantId,
    );
  }

  /** Dates as ISO strings and no staff notes: the tenant reads its audit log. */
  static snapshot(changes: object): object {
    return Object.fromEntries(
      Object.entries(changes)
        .filter(([key]) => key !== 'notes')
        .map(([key, value]) => [key, value instanceof Date ? value.toISOString() : value]),
    );
  }
}
