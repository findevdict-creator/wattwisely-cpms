import { HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseSession } from '../../common/database/database-session';
import { TransactionRunner } from '../../common/database/transaction-runner';
import { PermissionCatalog } from '../../common/permissions/permission-catalog';
import { ProblemException } from '../../common/problem/problem.exception';
import { TenantAccess } from '../../common/tenant/tenant-access';
import { PermissionDto } from './dto/permission.dto';
import { RoleDto } from './dto/role.dto';
import { RolesRepository } from './roles.repository';

/** The roles a tenant can give and the permissions behind them. Read-only until custom roles (M2). */
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
      throw new ProblemException(
        HttpStatus.NOT_FOUND,
        'role_not_found',
        'This role does not exist.',
      );
    }
    return role;
  }

  listPermissions(): PermissionDto[] {
    return PermissionCatalog.ENTRIES.map((entry) => new PermissionDto(entry));
  }
}
