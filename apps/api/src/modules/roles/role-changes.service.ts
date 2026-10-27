import { Injectable } from '@nestjs/common';
import {
  DatabaseErrors,
  DatabaseSession,
  Transaction,
  TransactionRunner,
  UuidV7,
} from '@wattwisely/db';
import { AuditRecorder } from '../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../common/problem/version-conflict';
import { RequestAuth } from '../../common/request/request-auth';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { TenantAccessResolver } from '../../common/tenant/tenant-access.resolver';
import { CreateRoleRequestDto } from './dto/create-role-request.dto';
import { RoleDto } from './dto/role.dto';
import { UpdateRoleRequestDto } from './dto/update-role-request.dto';
import { RoleErrors } from './role-errors';
import { RolePermissionPolicy } from './role-permission.policy';
import { RoleRecord } from './role-record';
import { RolesRepository } from './roles.repository';

/**
 * Creating, changing and deleting a tenant's custom roles (module 14). System roles are
 * refused: they come from migrations. A change to a role reaches everyone who holds it on
 * their next request: their cached access is dropped once the transaction has committed.
 */
@Injectable()
export class RoleChangesService {
  static readonly NAME_INDEX = 'roles_tenant_name_unique';

  constructor(
    private readonly runner: TransactionRunner,
    private readonly roles: RolesRepository,
    private readonly audit: AuditRecorder,
    private readonly accessResolver: TenantAccessResolver,
  ) {}

  async create(auth: RequestAuth, request: CreateRoleRequestDto): Promise<RoleDto> {
    const access = RoleChangesService.requireManage(auth);
    const keys = RolePermissionPolicy.check(request.permissions, access.permissions);
    const id = UuidV7.create();
    return this.run(access, async (tx) => {
      await this.requireFreeName(tx, request.name, id);
      await this.roles.insert(tx, {
        id,
        tenantId: access.tenant.id,
        name: request.name.trim(),
        description: request.description?.trim() ?? '',
        isSystem: false,
        createdBy: auth.requireAccount().id,
        updatedBy: auth.requireAccount().id,
      });
      await this.roles.setPermissions(tx, access.tenant.id, id, keys);
      const after = await this.requireCustom(tx, id);
      await this.record(tx, auth, 'roles.created', { before: null, after });
      return new RoleDto(after, 0);
    });
  }

  async update(
    auth: RequestAuth,
    id: string,
    version: number,
    request: UpdateRoleRequestDto,
  ): Promise<RoleDto> {
    const access = RoleChangesService.requireManage(auth);
    const keys = request.permissions
      ? RolePermissionPolicy.check(request.permissions, access.permissions)
      : null;
    const result = await this.run(access, async (tx) => {
      const before = await this.requireCustom(tx, id);
      await this.applyChanges(tx, auth, before, { version, request, keys });
      const after = await this.requireCustom(tx, id);
      await this.record(tx, auth, 'roles.updated', { before, after });
      const members = (await this.roles.countMembers(tx)).get(id) ?? 0;
      const holders = await this.roles.findHolderAccountIds(tx, id);
      return { dto: new RoleDto(after, members), holders };
    });
    result.holders.forEach((accountId) => this.accessResolver.forget(accountId));
    return result.dto;
  }

  async remove(auth: RequestAuth, id: string, version: number): Promise<void> {
    const access = RoleChangesService.requireManage(auth);
    await this.run(access, async (tx) => {
      const before = await this.requireCustom(tx, id);
      if (before.version !== version) {
        throw VersionConflict.exception();
      }
      const holders = await this.roles.findHolderAccountIds(tx, id);
      if (holders.length > 0) {
        throw RoleErrors.inUse((await this.roles.countMembers(tx)).get(id) ?? holders.length);
      }
      await this.roles.remove(tx, id);
      await this.record(tx, auth, 'roles.deleted', { before, after: null });
    });
  }

  /** The name and description at the version seen, then the permissions as a whole. */
  private async applyChanges(
    tx: Transaction,
    auth: RequestAuth,
    before: RoleRecord,
    change: { version: number; request: UpdateRoleRequestDto; keys: string[] | null },
  ): Promise<void> {
    if (change.request.name !== undefined) {
      await this.requireFreeName(tx, change.request.name, before.id);
    }
    const changes = {
      name: change.request.name?.trim(),
      description: change.request.description?.trim(),
      updatedBy: auth.requireAccount().id,
    };
    if (!(await this.roles.update(tx, before.id, change.version, changes))) {
      throw VersionConflict.exception();
    }
    if (change.keys) {
      await this.roles.setPermissions(tx, before.tenantId as string, before.id, change.keys);
    }
  }

  /** 404 for a role that does not exist in the tenant; 409 for a system role. */
  private async requireCustom(tx: Transaction, id: string): Promise<RoleRecord> {
    const role = UuidV7.isUuid(id) ? await this.roles.findById(tx, id) : null;
    if (!role) {
      throw RoleErrors.notFound();
    }
    if (role.isSystem) {
      throw RoleErrors.isSystem();
    }
    return role;
  }

  /** No two roles a tenant can see share a name, built-in ones included (case-insensitive). */
  private async requireFreeName(tx: Transaction, name: string, roleId: string): Promise<void> {
    const wanted = name.trim().toLowerCase();
    const roles = await this.roles.findAll(tx);
    if (roles.some((role) => role.id !== roleId && role.name.toLowerCase() === wanted)) {
      throw RoleErrors.nameTaken();
    }
  }

  /** Roles are tenant-wide, so shaping them needs custom_roles:manage for the whole company. */
  private static requireManage(auth: RequestAuth): TenantAccess {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'custom_roles:manage');
    return access;
  }

  private async run<T>(access: TenantAccess, work: (tx: Transaction) => Promise<T>): Promise<T> {
    try {
      return await this.runner.run(DatabaseSession.forTenant(access.tenant.id), work);
    } catch (error) {
      if (DatabaseErrors.violatedUniqueConstraint(error) === RoleChangesService.NAME_INDEX) {
        throw RoleErrors.nameTaken();
      }
      throw error;
    }
  }

  private record(
    tx: Transaction,
    auth: RequestAuth,
    action: string,
    change: { before: RoleRecord | null; after: RoleRecord | null },
  ): Promise<void> {
    const role = (change.after ?? change.before) as RoleRecord;
    const snapshot = (record: RoleRecord | null) =>
      record && {
        name: record.name,
        description: record.description,
        permissions: record.permissionKeys,
      };
    return this.audit.record(tx, auth, {
      action,
      targetType: 'role',
      targetId: role.id,
      targetLabel: role.name,
      before: snapshot(change.before),
      after: snapshot(change.after),
    });
  }
}
