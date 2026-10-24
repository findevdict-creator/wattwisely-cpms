import { Injectable } from '@nestjs/common';
import { DatabaseSession, TransactionRunner } from '@wattwisely/db';
import { PermissionCatalog } from '../../common/permissions/permission-catalog';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { PermissionDto } from './dto/permission.dto';
import { RoleDto } from './dto/role.dto';
import { RoleErrors } from './role-errors';
import { RolesRepository } from './roles.repository';

/** The roles a tenant can give (built-in and its own) and the permissions behind them. */
@Injectable()
export class RolesService {
  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly rolesRepository: RolesRepository,
  ) {}

  async list(access: TenantAccess): Promise<RoleDto[]> {
    return this.transactionRunner.run(DatabaseSession.forTenant(access.tenant.id), async (tx) => {
      const roles = await this.rolesRepository.findAll(tx);
      const counts = await this.rolesRepository.countMembers(tx);
      return roles.map((role) => new RoleDto(role, counts.get(role.id) ?? 0));
    });
  }

  async get(access: TenantAccess, roleId: string): Promise<RoleDto> {
    const roles = await this.list(access);
    const role = roles.find((candidate) => candidate.id === roleId);
    if (!role) {
      throw RoleErrors.notFound();
    }
    return role;
  }

  listPermissions(access: TenantAccess): PermissionDto[] {
    return PermissionCatalog.ENTRIES.map((entry) => new PermissionDto(entry, access.entitlements));
  }
}
