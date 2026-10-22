import { ApiProperty } from '@nestjs/swagger';
import { AuditLogEntryDto } from './audit-log-entry.dto';

/** One page of the audit log. */
export class AuditLogPageDto {
  @ApiProperty({ type: [AuditLogEntryDto] })
  readonly items: AuditLogEntryDto[];

  @ApiProperty({
    nullable: true,
    description: 'Pass as cursor to get the next page; null on the last page',
  })
  readonly next_cursor: string | null;

  constructor(items: AuditLogEntryDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
