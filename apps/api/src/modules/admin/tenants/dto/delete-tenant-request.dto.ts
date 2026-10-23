import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/** Body of POST /v1/admin/tenants/{id}/delete: the short name typed again, and why. */
export class DeleteTenantRequestDto {
  @ApiProperty({ example: 'acme-charging', description: "The tenant's slug, typed to confirm" })
  @IsString()
  @MaxLength(40)
  readonly confirm_slug!: string;

  @ApiProperty({ example: 'Contract ended 2026-09-30' })
  @IsString()
  @MinLength(3)
  @MaxLength(500)
  readonly reason!: string;
}
