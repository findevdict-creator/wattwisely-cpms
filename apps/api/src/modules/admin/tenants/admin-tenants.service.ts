import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { PageRequest } from '../../../common/paging/page-request';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdminTenantDescriber } from './admin-tenant.describer';
import { TenantRecord } from './admin-tenant-record';
import { AdminTenantsRepository } from './admin-tenants.repository';
import { AdminTenantDto } from './dto/admin-tenant.dto';
import { AdminTenantPageDto } from './dto/admin-tenant-page.dto';
import { AdminTenantSummaryDto } from './dto/admin-tenant-summary.dto';
import { ListAdminTenantsQueryDto } from './dto/list-admin-tenants-query.dto';
import { UpdateTenantRequestDto } from './dto/update-tenant-request.dto';

/** The details staff can change on a tenant. */
type TenantFields = Pick<TenantRecord, 'name' | 'region' | 'paymentMode'>;

/** The tenant list and page of the admin console (story ADM-04), and a tenant's details. */
@Injectable()
export class AdminTenantsService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly tenants: AdminTenantsRepository,
    private readonly audit: AuditRecorder,
    private readonly describer: AdminTenantDescriber,
  ) {}

  async list(auth: RequestAuth, query: ListAdminTenantsQueryDto): Promise<AdminTenantPageDto> {
    const page = PageRequest.from(query);
    const records = await this.platform.run(auth, (tx) =>
      this.tenants.findPage(tx, query, page.cursor, page.fetchSize),
    );
    const summaries = records.map((record) => new AdminTenantSummaryDto(record));
    const { items, nextCursor } = page.cut(summaries, (summary) => summary.name.toLowerCase());
    return new AdminTenantPageDto(items, nextCursor);
  }

  get(auth: RequestAuth, tenantId: string): Promise<AdminTenantDto> {
    return this.describer.describe(auth, tenantId);
  }

  async update(
    auth: RequestAuth,
    tenantId: string,
    version: number,
    body: UpdateTenantRequestDto,
  ): Promise<AdminTenantDto> {
    return this.platform.runInTenant(auth, tenantId, async (tx) => {
      const before = await this.describer.requireLive(tx, tenantId);
      const changes = {
        name: body.name?.trim() ?? before.tenant.name,
        region: body.region === undefined ? before.tenant.region : body.region,
        paymentMode: body.payment_mode ?? before.tenant.paymentMode,
      };
      if (!(await this.tenants.update(tx, tenantId, version, changes))) {
        throw VersionConflict.exception();
      }
      await this.record(tx, auth, before.tenant, changes);
      return this.describer.describeIn(tx, tenantId);
    });
  }

  private record(tx: Transaction, auth: RequestAuth, before: TenantRecord, after: TenantFields) {
    return this.audit.record(
      tx,
      auth,
      {
        action: 'admin.tenant_changed',
        targetType: 'tenant',
        targetId: before.id,
        targetLabel: before.slug,
        before: { name: before.name, region: before.region, paymentMode: before.paymentMode },
        after,
      },
      before.id,
    );
  }
}
