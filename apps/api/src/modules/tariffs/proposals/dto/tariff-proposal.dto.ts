import { ApiProperty } from '@nestjs/swagger';
import { ProposedTariffPrices } from '@wattwisely/db';
import { TariffPricesRequestDto } from '../../dto/tariff-prices-request.dto';
import { TariffProposalRecord } from '../tariff-proposal-record';

/** A proposed tariff change, waiting for the Owner or decided (story MGT-03). */
export class TariffProposalDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ nullable: true, description: 'The tariff to change; null for a new tariff' })
  readonly tariff_id: string | null;

  @ApiProperty()
  readonly name: string;

  @ApiProperty({ example: 'GBP' })
  readonly currency: string;

  @ApiProperty({ enum: ['proposed', 'approved', 'rejected', 'withdrawn'] })
  readonly status: string;

  @ApiProperty({ type: TariffPricesRequestDto, description: 'The proposed prices, as sent' })
  readonly prices: ProposedTariffPrices;

  @ApiProperty()
  readonly note: string;

  @ApiProperty({ description: 'Who proposed it' })
  readonly proposed_by: string;

  @ApiProperty()
  readonly proposed_at: string;

  @ApiProperty({ nullable: true })
  readonly decided_by: string | null;

  @ApiProperty({ nullable: true })
  readonly decided_at: string | null;

  @ApiProperty()
  readonly decision_comment: string;

  @ApiProperty({ nullable: true, description: 'After approval: the tariff created or changed' })
  readonly applied_tariff_id: string | null;

  @ApiProperty({ description: 'Send as If-Match when deciding or withdrawing' })
  readonly version: number;

  constructor(record: TariffProposalRecord) {
    this.id = record.id;
    this.tariff_id = record.tariffId;
    this.name = record.name;
    this.currency = record.currency;
    this.status = record.status;
    this.prices = record.prices;
    this.note = record.note;
    this.proposed_by = record.proposedByLabel;
    this.proposed_at = record.proposedAt.toISOString();
    this.decided_by = record.decidedByLabel;
    this.decided_at = record.decidedAt?.toISOString() ?? null;
    this.decision_comment = record.decisionComment;
    this.applied_tariff_id = record.appliedTariffId;
    this.version = record.version;
  }
}
