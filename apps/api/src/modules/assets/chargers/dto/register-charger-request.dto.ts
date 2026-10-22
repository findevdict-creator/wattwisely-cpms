import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
import { ChargerIdentity } from '../charger-identity';

/** Body of POST /v1/chargers (story AST-02): the setup wizard's choices. */
export class RegisterChargerRequestDto {
  @ApiProperty()
  @IsUUID()
  readonly site_id!: string;

  @ApiProperty({
    enum: ['generate', 'existing'],
    description: 'generate: WattWisely makes a WW- identity; existing: use the charger’s own',
  })
  @IsIn(['generate', 'existing'])
  readonly identity_mode!: 'generate' | 'existing';

  @ApiProperty({
    required: false,
    example: 'SN-AB129934',
    description: 'The charger’s own identity, when identity_mode is existing',
  })
  @IsOptional()
  @IsString()
  @Matches(ChargerIdentity.ALLOWED, {
    message: 'identity may hold letters, digits, dash, underscore and dot, up to 48 characters',
  })
  readonly identity?: string;

  @ApiProperty({
    enum: ['password', 'none'],
    default: 'password',
    description: 'none: the charger is recognised by its boot fingerprint instead',
  })
  @IsOptional()
  @IsIn(['password', 'none'])
  readonly auth_mode?: 'password' | 'none';

  @ApiProperty({ required: false, example: 'Alfen' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly vendor?: string;

  @ApiProperty({ required: false, example: 'Eve Single Pro-line' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly model?: string;

  @ApiProperty({ required: false, default: false, description: 'Also allow plain ws:// (no TLS)' })
  @IsOptional()
  @IsBoolean()
  readonly allow_plain_ws?: boolean;
}
