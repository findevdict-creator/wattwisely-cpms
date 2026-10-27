import { Site } from '../../core/api/models/site';
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

  /** "Whole company", the sites by name when two or fewer, or "3 sites". */
  static where(member: Member, sites: Site[]): string {
    if (member.roles.length === 0 || member.roles.some((role) => !role.site_ids)) {
      return 'Whole company';
    }
    const ids = [...new Set(member.roles.flatMap((role) => role.site_ids ?? []))];
    if (ids.length > 2) {
      return `${ids.length} sites`;
    }
    return ids.map((id) => sites.find((site) => site.id === id)?.name ?? '1 site').join(', ');
  }
}
