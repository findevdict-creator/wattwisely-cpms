import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsOptional, IsUUID } from 'class-validator';

/** Body of PUT /v1/admin/tenants/{id}/managed-service/operators/{staffId}. */
export class AssignOperatorRequestDto {
  @ApiProperty({
    required: false,
    type: [String],
    description: 'Limit the operator to these sites; omitted or empty: the whole tenant',
  })
  @IsOptional()
  @IsUUID('all', { each: true })
  @ArrayMaxSize(100)
  readonly site_ids?: string[];
}
