import { Member } from '../../core/api/models/member';
import { RoleAssignment } from '../../core/api/models/role';

/** Turns ticked role ids into the API's role list, keeping the sites a member already has per role. */
export class MemberRoles {
  static idsOf(member: Member): string[] {
    return member.roles.map((role) => role.role_id);
  }

  static assignments(roleIds: string[], member?: Member): RoleAssignment[] {
    return roleIds.map((roleId) => {
      const siteIds = member?.roles.find((role) => role.role_id === roleId)?.site_ids;
      return siteIds ? { role_id: roleId, site_ids: siteIds } : { role_id: roleId };
    });
  }

  static describe(member: Member): string {
    return member.roles
      .map((role) => (role.site_ids ? `${role.name} (${role.site_ids.length} sites)` : role.name))
      .join(', ');
  }
}
