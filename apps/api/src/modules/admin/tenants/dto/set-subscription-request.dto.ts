import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';

/** Body of PUT /v1/admin/tenants/{id}/subscription: the plan and billing contact. */
export class SetSubscriptionRequestDto {
  @ApiProperty()
  @IsUUID('all')
  readonly plan_id!: string;

  @ApiProperty({ enum: ['trialing', 'active', 'past_due', 'cancelled'], default: 'active' })
  @IsOptional()
  @IsIn(['trialing', 'active', 'past_due', 'cancelled'])
  readonly status?: 'trialing' | 'active' | 'past_due' | 'cancelled';

  @ApiProperty({ required: false, nullable: true, description: 'Only while trialing' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\d{4}-\d{2}-\d{2}(T.*)?$/, { message: 'trial_ends_at must be a date' })
  readonly trial_ends_at?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsEmail()
  @MaxLength(254)
  readonly billing_email?: string | null;

  @ApiProperty({ required: false, nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(120)
  readonly billing_name?: string | null;

  @ApiProperty({ required: false, nullable: true, description: 'VAT or purchase order number' })
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(60)
  readonly billing_reference?: string | null;

  @ApiProperty({ required: false, description: 'Staff notes, never shown to the tenant' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly notes?: string;
}
