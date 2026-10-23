import { Injectable } from '@nestjs/common';
import { Transaction, TransactionRunner } from '@wattwisely/db';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccessResolver } from '../../../common/tenant/tenant-access.resolver';
import { AssignOperatorRequestDto } from '../dto/assign-operator-request.dto';
import { ManagedOperatorDto } from '../dto/managed-operator.dto';
import { ManagedServiceDescriber } from '../managed-service.describer';
import { ManagedServiceErrors } from '../managed-service-errors';
import { ManagedServiceStatuses } from '../managed-service-record';
import { ManagedOperatorAssigner } from './managed-operator.assigner';

/**
 * Which Wattwisely staff work in a managed tenant (story MGT-02), from the admin console.
 * Staff can only be assigned once the Owner accepted the agreement; removing a staff
 * member from Wattwisely ends their work in every tenant at once.
 */
@Injectable()
export class ManagedOperatorsService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly accessResolver: TenantAccessResolver,
    private readonly describer: ManagedServiceDescriber,
    private readonly assigner: ManagedOperatorAssigner,
  ) {}

  list(auth: RequestAuth, tenantId: string): Promise<ManagedOperatorDto[]> {
    return this.platform.runInTenant(auth, tenantId, async (tx) => {
      await this.describer.requireLive(tx, tenantId);
      const operators = await this.assigner.current(tx, tenantId);
      return operators.map((operator) => new ManagedOperatorDto(operator));
    });
  }

  async assign(
    auth: RequestAuth,
    target: { tenantId: string; staffId: string },
    request: AssignOperatorRequestDto,
  ): Promise<ManagedOperatorDto> {
    const record = await this.platform.runInTenant(auth, target.tenantId, async (tx) => {
      const service = await this.describer.requireLive(tx, target.tenantId);
      if (!ManagedServiceStatuses.isInForce(service.status)) {
        throw ManagedServiceErrors.notManaged();
      }
      const staff = await this.assigner.requireStaff(tx, target.staffId);
      const current = await this.assigner.current(tx, target.tenantId);
      if (current.some((operator) => operator.userAccountId === staff.userAccountId)) {
        throw ManagedServiceErrors.alreadyOperator();
      }
      const siteIds = [...new Set(request.site_ids ?? [])];
      return this.assigner.assign(tx, auth, service, { staff, siteIds });
    });
    this.accessResolver.forget(record.userAccountId);
    return new ManagedOperatorDto(record);
  }

  async remove(auth: RequestAuth, target: { tenantId: string; staffId: string }): Promise<void> {
    const operator = await this.platform.runInTenant(auth, target.tenantId, async (tx) => {
      await this.describer.requireLive(tx, target.tenantId);
      const current = await this.assigner.current(tx, target.tenantId);
      const found = current.find((candidate) => candidate.staffId === target.staffId);
      if (!found) {
        throw ManagedServiceErrors.operatorNotFound();
      }
      await this.assigner.remove(tx, auth, found);
      return found;
    });
    this.accessResolver.forget(operator.userAccountId);
  }

  /**
   * Ends the person's work in every tenant, inside a platform transaction: when they leave
   * Wattwisely (the staff endpoints) their tenant access must end with their console access.
   * Their cached access is dropped right away; other API instances follow within 30 seconds.
   */
  async removeEverywhere(tx: Transaction, auth: RequestAuth, userAccountId: string) {
    const assignments = await this.assigner.assignmentsOf(tx, userAccountId);
    for (const assignment of assignments) {
      await TransactionRunner.switchTenant(tx, assignment.tenantId);
      await this.assigner.remove(tx, auth, assignment);
    }
    await TransactionRunner.switchTenant(tx, '');
    this.accessResolver.forget(userAccountId);
  }
}
