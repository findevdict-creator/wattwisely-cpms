import { ApiProperty } from '@nestjs/swagger';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantSummary } from '../../../common/tenant/tenant-summary';
import { TenantMembershipDto } from './tenant-membership.dto';

/** Body of GET /v1/me: the logged-in person and the tenants they can switch between. */
export class MeResponseDto {
  @ApiProperty({ nullable: true, description: 'Empty until Keycloak has verified the e-mail' })
  readonly id: string | null;

  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty()
  readonly is_platform_staff: boolean;

  @ApiProperty({ type: [TenantMembershipDto] })
  readonly tenants: TenantMembershipDto[];

  constructor(auth: RequestAuth, tenants: TenantSummary[]) {
    this.id = auth.account?.id ?? null;
    this.email = auth.account?.email ?? auth.user.email;
    this.name = auth.account?.name || auth.user.name;
    this.is_platform_staff = auth.user.isPlatformStaff;
    this.tenants = tenants.map((tenant) => new TenantMembershipDto(tenant));
  }
}
