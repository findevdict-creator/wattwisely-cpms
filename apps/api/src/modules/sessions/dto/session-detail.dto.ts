import { ApiProperty } from '@nestjs/swagger';
import { ReceiptLine, ReceiptLineDto } from '../../tariffs/dto/receipt-line.dto';
import { SessionRecord, SessionStateChangeRecord, SessionTariff } from '../session-record';
import { SessionPayment, SessionPaymentDto } from './session-payment.dto';
import { SessionStateChangeDto } from './session-state-change.dto';
import { SessionTariffDto } from './session-tariff.dto';
import { SessionDto } from './session.dto';

/** What GET /v1/sessions/{id} reads besides the session row. */
export interface SessionDetails {
  tariff: SessionTariff | null;
  lines: ReceiptLine[];
  history: SessionStateChangeRecord[];
  payment: SessionPayment | null;
}

/** A session with its receipt, its timeline and how it was priced. */
export class SessionDetailDto extends SessionDto {
  @ApiProperty({
    nullable: true,
    description: 'The OCPP 1.6 transactionId, once the charger started',
  })
  readonly ocpp_transaction_id: number | null;

  @ApiProperty({ description: 'The OCPP connector number on the charger' })
  readonly ocpp_connector_id: number;

  @ApiProperty({ example: 'Europe/London', description: 'Band times are read in it' })
  readonly time_zone: string;

  @ApiProperty({ nullable: true })
  readonly closed_at: string | null;

  @ApiProperty({ nullable: true })
  readonly meter_start_wh: number | null;

  @ApiProperty({ nullable: true })
  readonly meter_stop_wh: number | null;

  @ApiProperty({ nullable: true, example: 'EVDisconnected' })
  readonly stop_reason: string | null;

  @ApiProperty({ type: SessionTariffDto, nullable: true })
  readonly tariff: SessionTariffDto | null;

  @ApiProperty({ nullable: true })
  readonly priced_at: string | null;

  @ApiProperty({ nullable: true, example: '1.0.0' })
  readonly pricing_engine_version: string | null;

  @ApiProperty({ nullable: true, description: 'Hash of everything the engine read' })
  readonly pricing_input_hash: string | null;

  @ApiProperty({ type: [ReceiptLineDto], description: 'Empty until the final price' })
  readonly lines: ReceiptLineDto[];

  @ApiProperty({ type: [SessionStateChangeDto] })
  readonly state_changes: SessionStateChangeDto[];

  @ApiProperty({
    type: SessionPaymentDto,
    nullable: true,
    description: 'The card payment (module 6)',
  })
  readonly payment: SessionPaymentDto | null;

  constructor(session: SessionRecord, details: SessionDetails) {
    super(session);
    this.ocpp_transaction_id = session.ocppTransactionId;
    this.ocpp_connector_id = session.ocppConnectorId;
    this.time_zone = session.timeZone;
    this.closed_at = session.closedAt?.toISOString() ?? null;
    this.meter_start_wh = session.meterStartWh;
    this.meter_stop_wh = session.meterStopWh;
    this.stop_reason = session.stopReason;
    this.tariff = details.tariff ? new SessionTariffDto(details.tariff) : null;
    this.priced_at = session.pricedAt?.toISOString() ?? null;
    this.pricing_engine_version = session.pricingEngineVersion;
    this.pricing_input_hash = session.pricingInputHash;
    this.lines = details.lines.map((line) => new ReceiptLineDto(line));
    this.state_changes = details.history.map((change) => new SessionStateChangeDto(change));
    this.payment = details.payment ? new SessionPaymentDto(details.payment) : null;
  }
}
