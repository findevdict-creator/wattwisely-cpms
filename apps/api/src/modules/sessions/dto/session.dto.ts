import { ApiProperty } from '@nestjs/swagger';
import { SessionStates } from '@wattwisely/session-engine';
import { SessionRecord } from '../session-record';

/** A session as GET /v1/sessions lists it. Amounts are minor units of `currency`. */
export class SessionDto {
  @ApiProperty()
  readonly id: string;

  @ApiProperty({ enum: SessionStates.ALL })
  readonly status: string;

  @ApiProperty()
  readonly site_id: string;

  @ApiProperty()
  readonly site_name: string;

  @ApiProperty()
  readonly charger_id: string;

  @ApiProperty({ description: 'The OCPP identity of the charger' })
  readonly charger_identity: string;

  @ApiProperty()
  readonly connector_id: string;

  @ApiProperty()
  readonly connector_label: string;

  @ApiProperty({ description: 'The RFID card or token that started it' })
  readonly id_tag: string;

  @ApiProperty()
  readonly started_at: string;

  @ApiProperty({ nullable: true, description: 'When the charge stopped' })
  readonly ended_at: string | null;

  @ApiProperty({ nullable: true, description: 'When the car left' })
  readonly unplugged_at: string | null;

  @ApiProperty()
  readonly energy_wh: number;

  @ApiProperty({ nullable: true, example: 'GBP' })
  readonly currency: string | null;

  @ApiProperty({ nullable: true })
  readonly net_amount: number | null;

  @ApiProperty({ nullable: true })
  readonly tax_amount: number | null;

  @ApiProperty({
    nullable: true,
    description: 'The cost so far, or the final price once completed',
  })
  readonly gross_amount: number | null;

  @ApiProperty({ description: 'True once the worker gave the session its final price' })
  readonly is_priced: boolean;

  @ApiProperty({ type: [String], example: ['long_session'] })
  readonly review_flags: string[];

  @ApiProperty({ nullable: true, enum: ['no_valid_stop_data', 'stale', 'closed_by_staff'] })
  readonly failure_reason: string | null;

  @ApiProperty({ description: 'The driver pays by card' })
  readonly is_paid: boolean;

  @ApiProperty({ nullable: true, description: 'Where the card payment stands, when there is one' })
  readonly payment_status: string | null;

  constructor(session: SessionRecord) {
    this.id = session.id;
    this.status = session.status;
    this.site_id = session.siteId;
    this.site_name = session.siteName;
    this.charger_id = session.chargerId;
    this.charger_identity = session.chargerIdentity;
    this.connector_id = session.connectorId;
    this.connector_label = session.connectorLabel;
    this.id_tag = session.idTag;
    this.started_at = session.startedAt.toISOString();
    this.ended_at = session.endedAt?.toISOString() ?? null;
    this.unplugged_at = session.unpluggedAt?.toISOString() ?? null;
    this.energy_wh = session.energyWh;
    this.currency = session.currency;
    this.net_amount = session.netAmount;
    this.tax_amount = session.taxAmount;
    this.gross_amount = session.grossAmount;
    this.is_priced = session.pricedAt !== null;
    this.review_flags = session.reviewFlags;
    this.failure_reason = session.failureReason;
    this.is_paid = session.isPaid;
    this.payment_status = session.paymentStatus;
  }
}
