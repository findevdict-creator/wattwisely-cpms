import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/** Body of POST /v1/admin/tenants/{id}/managed-service: the agreement Wattwisely offers. */
export class OfferManagedServiceRequestDto {
  @ApiProperty({ description: 'The platform_staff id of the account manager' })
  @IsUUID('all')
  readonly account_manager_id!: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  readonly is_tariff_approval_required?: boolean;

  @ApiProperty({
    required: false,
    default: 0,
    description: 'The monthly fee for the service in minor units of the plan currency; 0 for none',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100_000_000)
  readonly monthly_fee?: number;

  @ApiProperty({ required: false, example: 'MSA-2026-014' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly agreement_reference?: string;

  @ApiProperty({ required: false, description: 'Staff notes, never shown to the tenant' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly notes?: string;
}
