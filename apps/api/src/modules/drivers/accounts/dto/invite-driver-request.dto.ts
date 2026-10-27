import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, MaxLength } from 'class-validator';

/** Body of POST /v1/drivers/{id}/invite (module 19): where to send the link; the driver's own address when left out. */
export class InviteDriverRequestDto {
  @ApiProperty({ required: false, example: 'dana@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  readonly email?: string;
}
