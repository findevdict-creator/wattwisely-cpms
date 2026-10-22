import { ApiProperty } from '@nestjs/swagger';
import { TenantSummary } from '../../../common/tenant/tenant-summary';
import { TenantMembershipDto } from '../../me/dto/tenant-membership.dto';

/** Answer to accepting an invitation: the tenant the person has just joined. */
export class AcceptedInvitationDto {
  @ApiProperty({ type: TenantMembershipDto })
  readonly tenant: TenantMembershipDto;

  constructor(tenant: TenantSummary) {
    this.tenant = new TenantMembershipDto(tenant);
  }
}
