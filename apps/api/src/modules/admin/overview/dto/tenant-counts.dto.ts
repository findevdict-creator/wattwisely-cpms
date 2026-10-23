import { ApiProperty } from '@nestjs/swagger';

/** How many tenants are in each state. */
export class TenantCountsDto {
  @ApiProperty()
  readonly total: number;

  @ApiProperty()
  readonly active: number;

  @ApiProperty()
  readonly trial: number;

  @ApiProperty()
  readonly suspended: number;

  @ApiProperty()
  readonly cancelled: number;

  constructor(byStatus: Map<string, number>) {
    this.active = byStatus.get('active') ?? 0;
    this.trial = byStatus.get('trial') ?? 0;
    this.suspended = byStatus.get('suspended') ?? 0;
    this.cancelled = byStatus.get('cancelled') ?? 0;
    this.total = this.active + this.trial + this.suspended + this.cancelled;
  }
}
