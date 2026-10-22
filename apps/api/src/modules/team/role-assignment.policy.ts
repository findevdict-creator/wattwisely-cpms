import { HttpStatus, Injectable } from '@nestjs/common';
import { Transaction } from '../../common/database/transaction-runner';
import { PermissionSet } from '../../common/permissions/permission-set';
import { ProblemException } from '../../common/problem/problem.exception';
import { AssetErrors } from '../assets/asset-errors';
import { SitesRepository } from '../assets/sites/sites.repository';
import { RoleRecord } from '../roles/role-record';
import { RolesRepository } from '../roles/roles.repository';
import { RoleAssignment } from './role-assignment';

/**
 * Checks roles before they are given (story ACC-02):
 * every role must exist, every site named must exist, and nobody can give a role with more
 * permissions than they hold themselves, over a wider area than they hold them.
 */
@Injectable()
export class RoleAssignmentPolicy {
  constructor(
    private readonly roles: RolesRepository,
    private readonly sites: SitesRepository,
  ) {}

  async check(tx: Transaction, assignments: RoleAssignment[], actor: PermissionSet): Promise<void> {
    RoleAssignmentPolicy.checkAgainst(assignments, await this.roles.findAll(tx), actor);
    await this.checkSites(tx, assignments);
  }

  static checkAgainst(
    assignments: RoleAssignment[],
    roles: RoleRecord[],
    actor: PermissionSet,
  ): void {
    for (const assignment of assignments) {
      const role = roles.find((candidate) => candidate.id === assignment.roleId);
      if (!role) {
        throw new ProblemException(
          HttpStatus.UNPROCESSABLE_ENTITY,
          'role_not_found',
          `Role ${assignment.roleId} does not exist.`,
        );
      }
      const missing = role.permissionKeys.find(
        (key) => !actor.scopeFor(key)?.covers(assignment.scope),
      );
      if (missing) {
        throw new ProblemException(
          HttpStatus.FORBIDDEN,
          'role_exceeds_own_access',
          `You cannot give the ${role.name} role there, because you do not hold ${missing} there yourself.`,
        );
      }
    }
  }

  /** A site-scoped role needs a site that exists in this tenant (removed sites do not count). */
  private async checkSites(tx: Transaction, assignments: RoleAssignment[]): Promise<void> {
    const siteIds = [...new Set(assignments.flatMap((a) => (a.siteId ? [a.siteId] : [])))];
    if (siteIds.length === 0) {
      return;
    }
    const existing = await this.sites.findExistingIds(tx, siteIds);
    if (siteIds.some((siteId) => !existing.has(siteId))) {
      throw AssetErrors.siteUnknown();
    }
  }
}
