import { Member } from '../../core/api/models/member';
import { RoleAssignment } from '../../core/api/models/role';

/** Turns a member's roles into the role picker's assignments and back, and describes them. */
export class MemberRoles {
  static assignmentsOf(member: Member): RoleAssignment[] {
    return member.roles.map((role) =>
      role.site_ids
        ? { role_id: role.role_id, site_ids: role.site_ids }
        : { role_id: role.role_id },
    );
  }

  /** Something is wrong when a role is set to chosen sites but none is chosen. */
  static isComplete(assignments: RoleAssignment[]): boolean {
    return (
      assignments.length > 0 &&
      assignments.every((assignment) => !assignment.site_ids || assignment.site_ids.length > 0)
    );
  }

  static describe(member: Member): string {
    return member.roles
      .map((role) => (role.site_ids ? `${role.name} (${role.site_ids.length} sites)` : role.name))
      .join(', ');
  }
}
