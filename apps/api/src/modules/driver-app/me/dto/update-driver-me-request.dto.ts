import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Body of PATCH /v1/driver/me: the name and phone the driver gives themselves; the e-mail is Keycloak's. */
export class UpdateDriverMeRequestDto {
  @ApiProperty({ required: false, example: 'Dana' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly display_name?: string;

  @ApiProperty({ required: false, nullable: true, example: '+44 7700 900123' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  readonly phone?: string | null;
}
