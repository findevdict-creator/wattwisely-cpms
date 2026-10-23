import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Body of POST /v1/admin/tenants (story ADM-01): the company, its plan and its first Owner. */
export class CreateTenantRequestDto {
  @ApiProperty({ example: 'Acme Charging' })
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  readonly name!: string;

  @ApiProperty({
    required: false,
    example: 'acme-charging',
    description: 'Derived from the name when left out; lower-case letters, digits and dashes',
  })
  @IsOptional()
  @Matches(/^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/, {
    message: 'slug must be 2 to 40 lower-case letters, digits or dashes',
  })
  readonly slug?: string;

  @ApiProperty({ required: false, example: 'DE', description: 'ISO country code' })
  @IsOptional()
  @Matches(/^[A-Z]{2}$/, { message: 'region must be a two-letter country code' })
  readonly region?: string;

  @ApiProperty({ required: false, enum: ['direct', 'managed'], default: 'direct' })
  @IsOptional()
  @IsIn(['direct', 'managed'])
  readonly payment_mode?: 'direct' | 'managed';

  @ApiProperty({ description: 'The plan to start on' })
  @IsUUID('all')
  readonly plan_id!: string;

  @ApiProperty({ required: false, enum: ['trialing', 'active'], default: 'active' })
  @IsOptional()
  @IsIn(['trialing', 'active'])
  readonly subscription_status?: 'trialing' | 'active';

  @ApiProperty({ required: false, description: 'Only while trialing' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/, { message: 'trial_ends_at must be a date' })
  readonly trial_ends_at?: string;

  @ApiProperty({ required: false, example: 'owner@acme.test', description: 'Invited as Owner' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  readonly owner_email?: string;

  @ApiProperty({ required: false, example: 'billing@acme.test' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  readonly billing_email?: string;

  @ApiProperty({ required: false, example: 'Acme Charging GmbH' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  readonly billing_name?: string;
}
