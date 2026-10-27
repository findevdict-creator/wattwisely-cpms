import { ApiProperty } from '@nestjs/swagger';
import { SessionStates } from '@wattwisely/session-engine';
import { SessionPaymentRuleDto } from '../../../sessions/dto/session-payment-rule.dto';
import { DriverChargeRecord } from '../driver-charge-record';
import { DriverChargePaymentDto } from './driver-charge-payment.dto';

/** One of the driver's own charges, at any of their operators (module 19). Amounts are minor units of `currency`. */
export class DriverChargeDto {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly tenant_id: string;
  @ApiProperty({ example: 'Acme Charging' }) readonly operator_name: string;
  @ApiProperty({ example: 'Riverside' }) readonly site_name: string;
  @ApiProperty({ example: 'CP-RIVER-1' }) readonly charger_identity: string;
  @ApiProperty({ example: 'A' }) readonly connector_label: string;
  @ApiProperty({ example: 1 }) readonly ocpp_connector_id: number;
  @ApiProperty({ enum: SessionStates.ALL }) readonly status: string;
  @ApiProperty({ example: 'Europe/London' }) readonly time_zone: string;
  @ApiProperty() readonly started_at: string;
  @ApiProperty({ nullable: true }) readonly ended_at: string | null;
  @ApiProperty() readonly energy_wh: number;
  @ApiProperty({ nullable: true, example: 'GBP' }) readonly currency: string | null;
  @ApiProperty({ nullable: true, description: 'The cost so far, or the amount taken at the end' })
  readonly amount: number | null;
  @ApiProperty({ description: 'A card hold was, or is to be, taken for it' })
  readonly is_paid: boolean;
  @ApiProperty({ nullable: true, enum: ['rfid_card', 'guest_card', 'chat', 'account', 'staff'] })
  readonly start_source: string | null;
  @ApiProperty({ type: SessionPaymentRuleDto, nullable: true })
  readonly payment_rule: SessionPaymentRuleDto | null;
  @ApiProperty({ type: DriverChargePaymentDto, nullable: true })
  readonly payment: DriverChargePaymentDto | null;
  @ApiProperty({
    nullable: true,
    description: 'Why the session ended without a charge, when it did',
  })
  readonly failure_reason: string | null;

  constructor(record: DriverChargeRecord) {
    this.id = record.id;
    this.tenant_id = record.tenantId;
    this.operator_name = record.operatorName;
    this.site_name = record.siteName;
    this.charger_identity = record.chargerIdentity;
    this.connector_label = record.connectorLabel;
    this.ocpp_connector_id = record.ocppConnectorId;
    this.status = record.status;
    this.time_zone = record.timeZone;
    this.started_at = record.startedAt.toISOString();
    this.ended_at = record.endedAt?.toISOString() ?? null;
    this.energy_wh = record.energyWh;
    this.currency = record.currency;
    this.amount = record.capturedAmount ?? record.grossAmount;
    this.is_paid = record.isPaid;
    this.start_source = record.startSource;
    this.payment_rule = record.paymentRule ? new SessionPaymentRuleDto(record.paymentRule) : null;
    this.payment = record.paymentStatus
      ? new DriverChargePaymentDto(record, record.paymentStatus)
      : null;
    this.failure_reason = record.failureReason;
  }
}
