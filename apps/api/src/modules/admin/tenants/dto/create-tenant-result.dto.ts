import { ApiProperty } from '@nestjs/swagger';
import { AdminTenantDto } from './admin-tenant.dto';

/** Answer of POST /v1/admin/tenants: the tenant, and whether the Owner's e-mail went out. */
export class CreateTenantResultDto {
  @ApiProperty({ type: AdminTenantDto })
  readonly tenant: AdminTenantDto;

  @ApiProperty({ nullable: true, description: 'Null when no Owner was invited' })
  readonly is_owner_email_sent: boolean | null;

  constructor(tenant: AdminTenantDto, isOwnerEmailSent: boolean | null) {
    this.tenant = tenant;
    this.is_owner_email_sent = isOwnerEmailSent;
  }
}
