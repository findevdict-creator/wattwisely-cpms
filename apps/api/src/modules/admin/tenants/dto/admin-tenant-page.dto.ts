import { ApiProperty } from '@nestjs/swagger';
import { AdminTenantSummaryDto } from './admin-tenant-summary.dto';

/** One page of tenants. */
export class AdminTenantPageDto {
  @ApiProperty({ type: [AdminTenantSummaryDto] })
  readonly items: AdminTenantSummaryDto[];

  @ApiProperty({
    nullable: true,
    description: 'Pass as cursor for the next page; null on the last',
  })
  readonly next_cursor: string | null;

  constructor(items: AdminTenantSummaryDto[], nextCursor: string | null) {
    this.items = items;
    this.next_cursor = nextCursor;
  }
}
