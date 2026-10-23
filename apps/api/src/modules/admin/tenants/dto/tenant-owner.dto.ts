import { ApiProperty } from '@nestjs/swagger';
import { MemberRecord } from '../../../team/member-record';

/** An Owner of a tenant, as the admin console shows them: who runs the account. */
export class TenantOwnerDto {
  @ApiProperty()
  readonly member_id: string;

  @ApiProperty({ example: 'owner@acme.test' })
  readonly email: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty({ enum: ['invited', 'active'] })
  readonly status: string;

  @ApiProperty({ nullable: true })
  readonly invited_at: string | null;

  @ApiProperty({ nullable: true })
  readonly joined_at: string | null;

  constructor(member: MemberRecord) {
    this.member_id = member.id;
    this.email = member.email;
    this.name = member.name;
    this.status = member.status;
    this.invited_at = member.invitedAt?.toISOString() ?? null;
    this.joined_at = member.joinedAt?.toISOString() ?? null;
  }
}
