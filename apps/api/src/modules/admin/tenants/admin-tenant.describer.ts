import { Injectable } from '@nestjs/common';
import { Transaction, UuidV7 } from '@wattwisely/db';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { RequestAuth } from '../../../common/request/request-auth';
import { SubscriptionDto } from '../../subscription/dto/subscription.dto';
import { SubscriptionDescriber } from '../../subscription/subscription.describer';
import { MembersRepository } from '../../team/members.repository';
import { MembershipsWriter } from '../../team/memberships.writer';
import { AdminTenantErrors } from './admin-tenant-errors';
import { AdminTenantRecord } from './admin-tenant-record';
import { AdminTenantsRepository } from './admin-tenants.repository';
import { AdminTenantDto } from './dto/admin-tenant.dto';
import { TenantOwnerDto } from './dto/tenant-owner.dto';

/** Builds the admin console's view of one tenant: the row, its plan and modules, its Owners. */
@Injectable()
export class AdminTenantDescriber {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly tenants: AdminTenantsRepository,
    private readonly subscriptions: SubscriptionDescriber,
    private readonly members: MembersRepository,
  ) {}

  async describe(auth: RequestAuth, tenantId: string): Promise<AdminTenantDto> {
    await this.platform.run(auth, (tx) => this.require(tx, tenantId));
    return this.platform.runInTenant(auth, tenantId, (tx) => this.describeIn(tx, tenantId));
  }

  /** Inside the tenant's transaction (platform access plus the tenant). */
  async describeIn(tx: Transaction, tenantId: string): Promise<AdminTenantDto> {
    const record = await this.require(tx, tenantId);
    const subscription = await this.subscription(tx, tenantId);
    return new AdminTenantDto(record, subscription, await this.owners(tx));
  }

  subscription(tx: Transaction, tenantId: string): Promise<SubscriptionDto> {
    return this.subscriptions.describe(tx, tenantId, true);
  }

  /** Invited and active members who hold Owner for the whole tenant. */
  async owners(tx: Transaction): Promise<TenantOwnerDto[]> {
    const members = await this.members.findAll(tx);
    return members
      .filter((member) =>
        member.grants.some(
          (grant) => grant.roleKey === MembershipsWriter.OWNER_ROLE_KEY && !grant.siteId,
        ),
      )
      .map((member) => new TenantOwnerDto(member));
  }

  /** The tenant, or 404. */
  async require(tx: Transaction, tenantId: string): Promise<AdminTenantRecord> {
    const record = UuidV7.isUuid(tenantId) ? await this.tenants.findById(tx, tenantId) : null;
    if (!record) {
      throw AdminTenantErrors.notFound();
    }
    return record;
  }

  /** The tenant, or 404; 409 when it was deleted. */
  async requireLive(tx: Transaction, tenantId: string): Promise<AdminTenantRecord> {
    const record = await this.require(tx, tenantId);
    if (record.tenant.deletedAt) {
      throw AdminTenantErrors.deleted();
    }
    return record;
  }
}
