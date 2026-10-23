import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/** Body of PATCH /v1/admin/tenants/{id}/managed-service: only the fields sent change. Needs If-Match. */
export class UpdateManagedServiceRequestDto {
  @ApiProperty({ required: false, description: 'The platform_staff id of the account manager' })
  @IsOptional()
  @IsUUID('all')
  readonly account_manager_id?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  readonly is_tariff_approval_required?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly agreement_reference?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  readonly notes?: string;
}
