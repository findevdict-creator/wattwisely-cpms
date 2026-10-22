import { HttpStatus, Injectable } from '@nestjs/common';
import { Transaction } from '../../common/database/transaction-runner';
import { PermissionSet } from '../../common/permissions/permission-set';
import { ProblemException } from '../../common/problem/problem.exception';
import { RoleRecord } from '../roles/role-record';
import { RolesRepository } from '../roles/roles.repository';
import { RoleAssignment } from './role-assignment';

/**
 * Checks roles before they are given (story ACC-02):
 * every role must exist, and nobody can give a role with more permissions than they
 * hold themselves, over a wider area than they hold them.
 */
@Injectable()
export class RoleAssignmentPolicy {
  constructor(private readonly roles: RolesRepository) {}

  async check(tx: Transaction, assignments: RoleAssignment[], actor: PermissionSet): Promise<void> {
    RoleAssignmentPolicy.checkAgainst(assignments, await this.roles.findAll(tx), actor);
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
}
