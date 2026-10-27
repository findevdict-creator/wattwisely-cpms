import { Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import { ApiKeyAccessResolver } from '../../../common/api-keys/api-key-access.resolver';
import { ApiKeyToken } from '../../../common/api-keys/api-key-token';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ApiKeyChangeErrors } from './api-key-change-errors';
import { ApiKeyRecord } from './api-key-record';
import { ApiKeyScopePolicy } from './api-key-scope.policy';
import { ApiKeysRepository } from './api-keys.repository';
import { ApiKeyDto } from './dto/api-key.dto';
import { CreateApiKeyRequestDto } from './dto/create-api-key-request.dto';
import { CreatedApiKeyDto } from './dto/created-api-key.dto';
import { UpdateApiKeyRequestDto } from './dto/update-api-key-request.dto';

/**
 * Making, renaming and revoking a tenant's API keys (module 16). The token is made here,
 * hashed for the row and answered once; a revoked key stops working on this API instance at
 * once and on the others within 30 seconds, as a removed member does (module 2).
 */
@Injectable()
export class ApiKeyChangesService {
  constructor(
    private readonly runner: TransactionRunner,
    private readonly keys: ApiKeysRepository,
    private readonly audit: AuditRecorder,
    private readonly resolver: ApiKeyAccessResolver,
  ) {}

  async create(auth: RequestAuth, request: CreateApiKeyRequestDto): Promise<CreatedApiKeyDto> {
    const access = ApiKeyChangesService.requireManage(auth);
    const permissionKeys = ApiKeyScopePolicy.check(request.permissions, access.permissions);
    const expiresAt = ApiKeyChangesService.expiry(request.expires_at);
    const token = ApiKeyToken.generate();
    const id = UuidV7.create();
    const record = await this.run(access, async (tx) => {
      await this.keys.insert(tx, {
        id,
        tenantId: access.tenant.id,
        name: request.name.trim(),
        description: request.description?.trim() ?? '',
        keyHash: ApiKeyToken.hashOf(token),
        keyHint: ApiKeyToken.hintOf(token),
        permissionKeys,
        createdBy: auth.requireAccount().id,
        expiresAt,
      });
      const after = await this.require(tx, id);
      await this.record(tx, auth, 'api_keys.created', { before: null, after });
      return after;
    });
    return new CreatedApiKeyDto(record, token);
  }

  async update(
    auth: RequestAuth,
    id: string,
    version: number,
    request: UpdateApiKeyRequestDto,
  ): Promise<ApiKeyDto> {
    const access = ApiKeyChangesService.requireManage(auth);
    const record = await this.run(access, async (tx) => {
      const before = await this.require(tx, id);
      const changes = { name: request.name?.trim(), description: request.description?.trim() };
      if (!(await this.keys.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      const after = await this.require(tx, id);
      await this.record(tx, auth, 'api_keys.updated', { before, after });
      return after;
    });
    return new ApiKeyDto(record);
  }

  async revoke(auth: RequestAuth, id: string, version: number): Promise<ApiKeyDto> {
    const access = ApiKeyChangesService.requireManage(auth);
    const record = await this.run(access, async (tx) => {
      const before = await this.require(tx, id);
      if (before.revokedAt) {
        throw ApiKeyChangeErrors.alreadyRevoked();
      }
      const changes = { revokedAt: new Date(), revokedBy: auth.requireAccount().id };
      if (!(await this.keys.update(tx, id, version, changes))) {
        throw VersionConflict.exception();
      }
      const after = await this.require(tx, id);
      await this.record(tx, auth, 'api_keys.revoked', { before, after });
      return after;
    });
    this.resolver.forgetTenant(access.tenant.id);
    return new ApiKeyDto(record);
  }

  private async require(tx: Transaction, id: string): Promise<ApiKeyRecord> {
    const record = UuidV7.isUuid(id) ? await this.keys.findById(tx, id) : null;
    if (!record) {
      throw ApiKeyChangeErrors.notFound();
    }
    return record;
  }

  private static expiry(value: string | null | undefined): Date | null {
    if (!value) {
      return null;
    }
    const expiresAt = new Date(value);
    if (expiresAt.getTime() <= Date.now()) {
      throw ApiKeyChangeErrors.expiryInPast();
    }
    return expiresAt;
  }

  /** Keys are company-wide, so making one needs api_keys:manage for the whole company. */
  private static requireManage(auth: RequestAuth): TenantAccess {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'api_keys:manage');
    return access;
  }

  private run<T>(access: TenantAccess, work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), work);
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { before: ApiKeyRecord | null; after: ApiKeyRecord | null },
  ): Promise<void> {
    const key = (change.after ?? change.before) as ApiKeyRecord;
    const snapshot = (record: ApiKeyRecord | null) =>
      record && {
        name: record.name,
        description: record.description,
        permissions: record.permissionKeys,
        expires_at: record.expiresAt?.toISOString() ?? null,
        revoked_at: record.revokedAt?.toISOString() ?? null,
      };
    return this.audit.record(tx, auth, {
      action,
      targetType: 'api_key',
      targetId: key.id,
      targetLabel: key.name,
      before: snapshot(change.before),
      after: snapshot(change.after),
    });
  }
}
