import { ApiProperty } from '@nestjs/swagger';
import { TenantOwnerDto } from './tenant-owner.dto';

/** Answer of an Owner invitation: the invitation and whether its e-mail went out. */
export class InviteOwnerResultDto {
  @ApiProperty({ type: TenantOwnerDto })
  readonly owner: TenantOwnerDto;

  @ApiProperty({ description: 'False when the mail server refused; the invitation can be resent' })
  readonly is_email_sent: boolean;

  constructor(owner: TenantOwnerDto, isEmailSent: boolean) {
    this.owner = owner;
    this.is_email_sent = isEmailSent;
  }
}
