import { ApiProperty } from '@nestjs/swagger';
import { PlatformAccess } from '../../../common/platform/platform-access';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantSummary } from '../../../common/tenant/tenant-summary';
import { PendingInvitationDto } from '../../invitations/dto/pending-invitation.dto';
import { PlatformRoleDto } from './platform-role.dto';
import { TenantMembershipDto } from './tenant-membership.dto';

/** What the API found out about the person, for the body. */
export interface MeDetails {
  tenants: TenantSummary[];
  invitations: PendingInvitationDto[];
  platform: PlatformAccess | null;
}

/**
 * Body of GET /v1/me: the logged-in person, the tenants they can switch between and the
 * invitations waiting for them.
 */
export class MeResponseDto {
  @ApiProperty({ nullable: true, description: 'Empty until Keycloak has verified the e-mail' })
  readonly id: string | null;

  @ApiProperty()
  readonly email: string;

  @ApiProperty()
  readonly name: string;

  @ApiProperty({ description: 'True for Wattwisely staff, who can open the admin console' })
  readonly is_platform_staff: boolean;

  @ApiProperty({ type: PlatformRoleDto, nullable: true })
  readonly platform: PlatformRoleDto | null;

  @ApiProperty({ type: [TenantMembershipDto] })
  readonly tenants: TenantMembershipDto[];

  @ApiProperty({
    type: [PendingInvitationDto],
    description: 'Unexpired invitations to tenants the person is not a member of yet',
  })
  readonly invitations: PendingInvitationDto[];

  constructor(auth: RequestAuth, details: MeDetails) {
    const { platform } = details;
    this.id = auth.account?.id ?? null;
    this.email = MeResponseDto.emailOf(auth);
    this.name = MeResponseDto.nameOf(auth);
    this.is_platform_staff = platform !== null;
    this.platform = platform ? new PlatformRoleDto(platform) : null;
    this.tenants = details.tenants.map((tenant) => new TenantMembershipDto(tenant));
    this.invitations = details.invitations;
  }

  /** The account's e-mail, or the token's for a first login; an API key has neither. */
  private static emailOf(auth: RequestAuth): string {
    return auth.account?.email ?? auth.user?.email ?? '';
  }

  private static nameOf(auth: RequestAuth): string {
    return auth.account?.name || (auth.user?.name ?? '');
  }
}
