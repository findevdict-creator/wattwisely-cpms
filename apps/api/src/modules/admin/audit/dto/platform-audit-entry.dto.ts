import { ApiProperty } from '@nestjs/swagger';
import { AuditLogRecord } from '../../../audit-log/audit-log-record';
import { AuditLogEntryDto } from '../../../audit-log/dto/audit-log-entry.dto';

/** An audit entry as the admin console lists it: with the tenant it belongs to. */
export class PlatformAuditEntryDto extends AuditLogEntryDto {
  @ApiProperty({ nullable: true, description: 'Null for platform actions (plans, staff)' })
  readonly tenant_id: string | null;

  constructor(record: AuditLogRecord, hasChanges: boolean) {
    super(record, hasChanges);
    this.tenant_id = record.tenantId;
  }
}
