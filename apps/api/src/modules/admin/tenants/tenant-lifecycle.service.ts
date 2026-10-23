import { Injectable } from '@nestjs/common';
import { Transaction } from '@wattwisely/db';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { PlatformTransaction } from '../../../common/platform/platform-transaction';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { AdminTenantDescriber } from './admin-tenant.describer';
import { AdminTenantErrors } from './admin-tenant-errors';
import { TenantRecord } from './admin-tenant-record';
import { AdminTenantsRepository } from './admin-tenants.repository';
import { AdminTenantDto } from './dto/admin-tenant.dto';
import { DeleteTenantRequestDto } from './dto/delete-tenant-request.dto';
import { TenantDeletionPolicy } from './tenant-deletion.policy';

/** A change of a tenant's state, with the version the caller saw and the reason for the log. */
export interface LifecycleRequest {
  tenantId: string;
  version: number;
  reason: string;
}

/**
 * Suspending, reactivating and deleting tenants (story ADM-02). A suspended tenant stays
 * read-only for its members (PermissionGuard) and its chargers keep working. Deleting
 * marks the tenant; its rows stay for the retention period and its slug stays taken.
 */
@Injectable()
export class TenantLifecycleService {
  constructor(
    private readonly platform: PlatformTransaction,
    private readonly tenants: AdminTenantsRepository,
    private readonly audit: AuditRecorder,
    private readonly describer: AdminTenantDescriber,
  ) {}

  suspend(auth: RequestAuth, request: LifecycleRequest): Promise<AdminTenantDto> {
    return this.change(auth, request, 'tenant_suspended', (tenant) => {
      if (tenant.status !== 'active' && tenant.status !== 'trial') {
        throw AdminTenantErrors.wrongStatus('Only an active tenant can be suspended.');
      }
      return { status: 'suspended', suspendedAt: new Date() };
    });
  }

  reactivate(auth: RequestAuth, request: LifecycleRequest): Promise<AdminTenantDto> {
    return this.change(auth, request, 'tenant_reactivated', (tenant) => {
      if (tenant.status !== 'suspended') {
        throw AdminTenantErrors.wrongStatus('Only a suspended tenant can be reactivated.');
      }
      return { status: 'active', suspendedAt: null };
    });
  }

  delete(
    auth: RequestAuth,
    request: LifecycleRequest & DeleteTenantRequestDto,
  ): Promise<AdminTenantDto> {
    return this.change(auth, request, 'tenant_deleted', (tenant) => {
      if (request.confirm_slug !== tenant.slug) {
        throw AdminTenantErrors.confirmationMismatch();
      }
      if (!TenantDeletionPolicy.canDelete(tenant)) {
        const from = TenantDeletionPolicy.allowedFrom(tenant);
        throw from
          ? AdminTenantErrors.tooEarlyToDelete(from)
          : AdminTenantErrors.wrongStatus(
              'Suspend the tenant first; it can be deleted 30 days later.',
            );
      }
      return { status: 'cancelled', deletedAt: new Date() };
    });
  }

  private change(
    auth: RequestAuth,
    request: LifecycleRequest,
    action: string,
    next: (tenant: TenantRecord) => Partial<TenantRecord>,
  ): Promise<AdminTenantDto> {
    return this.platform.runInTenant(auth, request.tenantId, async (tx) => {
      const { tenant } = await this.describer.requireLive(tx, request.tenantId);
      const changes = next(tenant);
      if (!(await this.tenants.update(tx, tenant.id, request.version, changes))) {
        throw VersionConflict.exception();
      }
      await this.record(tx, auth, tenant, {
        action,
        reason: request.reason,
        status: changes.status,
      });
      return this.describer.describeIn(tx, tenant.id);
    });
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    tenant: TenantRecord,
    change: { action: string; reason: string; status?: string },
  ): Promise<void> {
    return this.audit.record(
      tx,
      auth,
      {
        action: `admin.${change.action}`,
        targetType: 'tenant',
        targetId: tenant.id,
        targetLabel: tenant.slug,
        before: { status: tenant.status },
        after: { status: change.status, reason: change.reason },
      },
      tenant.id,
    );
  }
}
