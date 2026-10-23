import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Body of POST /v1/admin/tenants/{id}/managed-service: the agreement Wattwisely offers. */
export class OfferManagedServiceRequestDto {
  @ApiProperty({ description: 'The platform_staff id of the account manager' })
  @IsUUID('all')
  readonly account_manager_id!: string;

  @ApiProperty({ required: false, default: true })
  @IsOptional()
  @IsBoolean()
  readonly is_tariff_approval_required?: boolean;

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
