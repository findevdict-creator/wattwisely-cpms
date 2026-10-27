import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsIn, MaxLength } from 'class-validator';

/** Body of POST /v1/admin/staff: who, by e-mail, and in which role. */
export class AddStaffRequestDto {
  @ApiProperty({
    example: 'ana@wattwisely.test',
    description: 'Their login e-mail; the account is created if new',
  })
  @IsEmail()
  @MaxLength(254)
  readonly email!: string;

  @ApiProperty({ enum: ['admin', 'billing', 'support', 'viewer'] })
  @IsIn(['admin', 'billing', 'support', 'viewer'])
  readonly role!: 'admin' | 'billing' | 'support' | 'viewer';
}
