import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { ManagedServiceSummaryDto } from './dto/managed-service-summary.dto';
import { ManagedServiceRecord } from './managed-service-record';
import { ManagedServicesRepository } from './managed-services.repository';

/**
 * What other modules need to know about a tenant's live agreement: the summary for
 * GET /v1/me/permissions, and whether a Managed operator's tariff change needs approval.
 */
@Injectable()
export class ManagedServiceLookup {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly services: ManagedServicesRepository,
  ) {}

  /** Inside a transaction in the tenant. */
  live(tx: Transaction, tenantId: string): Promise<ManagedServiceRecord | null> {
    return this.services.findLive(tx, tenantId);
  }

  async summaryFor(access: TenantAccess): Promise<ManagedServiceSummaryDto | null> {
    const record = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.live(tx, access.tenant.id),
    );
    return record ? new ManagedServiceSummaryDto(record, access.isManagedOperator) : null;
  }

  /** True when the caller is a Managed operator whose agreement makes tariff changes wait for the Owner. */
  async isTariffApprovalRequired(tx: Transaction, access: TenantAccess): Promise<boolean> {
    if (!access.isManagedOperator) {
      return false;
    }
    const record = await this.live(tx, access.tenant.id);
    return record?.isTariffApprovalRequired ?? false;
  }
}
