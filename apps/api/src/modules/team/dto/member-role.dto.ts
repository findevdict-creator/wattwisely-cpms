import { ApiProperty } from '@nestjs/swagger';
import { MemberGrant } from '../member-record';

/** A role a member holds; site_ids is null when it covers the whole tenant. */
export class MemberRoleDto {
  @ApiProperty()
  readonly role_id: string;

  @ApiProperty({ nullable: true, example: 'technician' })
  readonly key: string | null;

  @ApiProperty({ example: 'Technician' })
  readonly name: string;

  @ApiProperty({ nullable: true, type: [String] })
  readonly site_ids: string[] | null;

  constructor(grants: MemberGrant[]) {
    this.role_id = grants[0].roleId;
    this.key = grants[0].roleKey;
    this.name = grants[0].roleName;
    const isWholeTenant = grants.some((grant) => grant.siteId === null);
    this.site_ids = isWholeTenant ? null : grants.map((grant) => grant.siteId as string);
  }

  /** One entry per role, with all its sites together. */
  static fromGrants(grants: MemberGrant[]): MemberRoleDto[] {
    const byRole = new Map<string, MemberGrant[]>();
    for (const grant of grants) {
      byRole.set(grant.roleId, [...(byRole.get(grant.roleId) ?? []), grant]);
    }
    return [...byRole.values()].map((roleGrants) => new MemberRoleDto(roleGrants));
  }
}
