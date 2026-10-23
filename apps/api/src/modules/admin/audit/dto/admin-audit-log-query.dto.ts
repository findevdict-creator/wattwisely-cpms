import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ListAuditLogQueryDto } from '../../../audit-log/dto/list-audit-log-query.dto';

/** Query of GET /v1/admin/audit-log: the tenant log's filters, plus which tenant. */
export class AdminAuditLogQueryDto extends ListAuditLogQueryDto {
  @ApiProperty({
    required: false,
    description: 'One tenant; leave out for every tenant and platform actions',
  })
  @IsOptional()
  @IsUUID('all')
  readonly tenant_id?: string;
}
