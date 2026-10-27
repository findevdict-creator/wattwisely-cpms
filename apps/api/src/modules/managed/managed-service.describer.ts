import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { ManagedServiceDto } from './dto/managed-service.dto';
import { ManagedServiceErrors } from './managed-service-errors';
import { ManagedServiceRecord, ManagedServiceStatuses } from './managed-service-record';
import { ManagedOperatorsRepository } from './managed-operators.repository';
import { ManagedServicesRepository } from './managed-services.repository';
import { ManagedTenantLookup } from './admin/managed-tenant.lookup';

/** Builds the answer of the managed service endpoints: the agreement and the staff working in the tenant. */
@Injectable()
export class ManagedServiceDescriber {
  constructor(
    private readonly services: ManagedServicesRepository,
    private readonly operators: ManagedOperatorsRepository,
    private readonly tenants: ManagedTenantLookup,
  ) {}

  /** The live agreement, or the latest past one, or 404. */
  async describe(
    tx: Transaction,
    tenantId: string,
    isStaffView: boolean,
  ): Promise<ManagedServiceDto> {
    const record = await this.current(tx, tenantId);
    if (!record) {
      throw ManagedServiceErrors.notFound();
    }
    return this.describeRecord(tx, record, isStaffView);
  }

  async describeRecord(
    tx: Transaction,
    record: ManagedServiceRecord,
    isStaffView: boolean,
  ): Promise<ManagedServiceDto> {
    const operators = ManagedServiceStatuses.isLive(record.status)
      ? await this.operators.findActive(tx, record.tenantId)
      : [];
    return new ManagedServiceDto(record, operators, { isStaffView });
  }

  /** The live agreement, or the latest past one, or null. */
  async current(tx: Transaction, tenantId: string): Promise<ManagedServiceRecord | null> {
    const live = await this.services.findLive(tx, tenantId);
    if (live) {
      return live;
    }
    return (await this.services.findHistory(tx, tenantId))[0] ?? null;
  }

  /** The tenant an admin console request names, or 404; 409 when deleted and `isLiveRequired`. */
  async requireTenant(tx: Transaction, tenantId: string, isLiveRequired = false) {
    return isLiveRequired
      ? this.tenants.requireLive(tx, tenantId)
      : this.tenants.require(tx, tenantId);
  }

  /** The live agreement, or 404. */
  async requireLive(tx: Transaction, tenantId: string): Promise<ManagedServiceRecord> {
    const record = await this.services.findLive(tx, tenantId);
    if (!record) {
      throw ManagedServiceErrors.notFound();
    }
    return record;
  }
}
