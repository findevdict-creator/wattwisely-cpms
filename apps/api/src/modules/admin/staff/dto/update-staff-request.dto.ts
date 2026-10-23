import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

/** Body of PATCH /v1/admin/staff/{id}: a new role. */
export class UpdateStaffRequestDto {
  @ApiProperty({ enum: ['admin', 'billing', 'support', 'viewer'] })
  @IsIn(['admin', 'billing', 'support', 'viewer'])
  readonly role!: 'admin' | 'billing' | 'support' | 'viewer';
}
