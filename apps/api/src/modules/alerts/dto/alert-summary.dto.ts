import { ApiProperty } from '@nestjs/swagger';

/** GET /v1/alerts/summary: the counts behind the badge on the portal's Alerts link. */
export class AlertSummaryDto {
  @ApiProperty() readonly open: number;
  @ApiProperty() readonly acknowledged: number;

  constructor(counts: { open: number; acknowledged: number }) {
    this.open = counts.open;
    this.acknowledged = counts.acknowledged;
  }
}
