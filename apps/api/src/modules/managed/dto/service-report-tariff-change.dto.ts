import { ApiProperty } from '@nestjs/swagger';
import { TariffChangeRow } from '../report/service-report-data';

/** A tariff change in the month, from the audit log. */
export class ServiceReportTariffChangeDto {
  @ApiProperty({ example: 'tariffs.prices_changed' })
  readonly action: string;

  @ApiProperty({ nullable: true })
  readonly tariff_name: string | null;

  @ApiProperty()
  readonly occurred_at: string;

  @ApiProperty()
  readonly actor_label: string;

  @ApiProperty({ description: 'True when a Managed operator made the change' })
  readonly is_by_wattwisely: boolean;

  constructor(row: TariffChangeRow) {
    this.action = row.action;
    this.tariff_name = row.targetLabel;
    this.occurred_at = row.occurredAt.toISOString();
    this.actor_label = row.actorLabel;
    this.is_by_wattwisely = row.actorType === 'managed';
  }
}
