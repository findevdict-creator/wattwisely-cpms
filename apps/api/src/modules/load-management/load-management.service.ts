import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner } from '@wattwisely/db';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { LoadManagementDto } from './dto/load-management.dto';
import { LoadManagementErrors } from './load-management-errors';
import { LoadPolicyRecord } from './load-management-record';
import { LoadManagementRepository } from './load-management.repository';

/** Reads a site's load management page (module 17): the policy, or the defaults when there is none yet. */
@Injectable()
export class LoadManagementService {
  static readonly DEFAULTS: Omit<LoadPolicyRecord, 'siteId'> = {
    isEnabled: false,
    limitKw: 100,
    strategy: 'equal_share',
    minPowerKw: 4.2,
    version: 0,
    updatedAt: null,
  };

  constructor(
    private readonly runner: TransactionRunner,
    private readonly repository: LoadManagementRepository,
  ) {}

  async view(access: TenantAccess, siteId: string): Promise<LoadManagementDto> {
    SitePermissionChecker.requireAt(access, 'load_management:read', siteId);
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const policy = await this.requirePolicy(tx, siteId);
      return new LoadManagementDto(policy, await this.repository.chargers(tx, siteId));
    });
  }

  /** The stored policy, or the defaults for a site that has none; 404 for a site that is not there. */
  async requirePolicy(tx: Transaction, siteId: string): Promise<LoadPolicyRecord> {
    await this.requireSiteName(tx, siteId);
    return (
      (await this.repository.policy(tx, siteId)) ?? { ...LoadManagementService.DEFAULTS, siteId }
    );
  }

  async requireSiteName(tx: Transaction, siteId: string): Promise<string> {
    const name = await this.repository.siteName(tx, siteId);
    if (name === null) {
      throw LoadManagementErrors.siteNotFound();
    }
    return name;
  }
}
