import { ApiProperty } from '@nestjs/swagger';
import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { TenantMembershipDto } from './tenant-membership.dto';

/** Body of GET /v1/me: the logged-in person and the tenants they can switch between. */
export class MeResponseDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly is_platform_staff: boolean;

  @ApiProperty({ type: [TenantMembershipDto] })
  readonly tenants: TenantMembershipDto[];

  constructor(user: AuthenticatedUser) {
    this.id = user.id;
    this.email = user.email;
    this.name = user.name;
    this.is_platform_staff = user.isPlatformStaff;
    this.tenants = user.memberships.map((membership) => new TenantMembershipDto(membership));
  }
}
