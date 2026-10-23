import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MaxLength } from 'class-validator';

/** Body of POST /v1/admin/tenants/{id}/owners/invites. */
export class InviteOwnerRequestDto {
  @ApiProperty({ example: 'owner@acme.test' })
  @IsEmail()
  @MaxLength(254)
  readonly email!: string;
}
