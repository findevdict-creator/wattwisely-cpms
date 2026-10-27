import { ApiProperty } from '@nestjs/swagger';
import { PlatformAuditEntryDto } from './platform-audit-entry.dto';

/** One page of the platform-wide audit log. */
export class PlatformAuditPageDto {
  @ApiProperty({ type: [PlatformAuditEntryDto] })
  readonly items: PlatformAuditEntryDto[];

  @ApiProperty({ nullable: true })
  readonly next_cursor: string | null;

  constructor(items: PlatformAuditEntryDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
