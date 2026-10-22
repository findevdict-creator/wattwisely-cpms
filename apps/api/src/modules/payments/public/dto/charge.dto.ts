import { ApiProperty } from '@nestjs/swagger';
import { PaymentRow, PaymentStatuses } from '@wattwisely/payments';
import { SessionRow, SessionStates } from '@wattwisely/session-engine';
import { ChargePlace } from '../charge-place.lookup';
import { ChargeOutcome } from '../charge-receipt.lookup';
import { ChargeReceiptDto } from './charge-receipt.dto';

/** What the driver's page needs besides the payment and session rows. */
export interface ChargeDetails extends ChargePlace {
  chargeKey: string;
  /** Only while the hold waits for the card; the page confirms it with the provider's form. */
  clientSecret: string | null;
  publishableKey: string | null;
  outcome: ChargeOutcome;
  isStopRequested: boolean;
}

/**
 * A paid charge as the driver's page follows it, with no login: the key in the URL is
 * the proof. Amounts are minor units of `currency`.
 */
export class ChargeDto {
  @ApiProperty({ description: 'Keep it: it is the only way back to this charge' })
  readonly charge_key: string;

  @ApiProperty()
  readonly session_id: string;

  @ApiProperty({ enum: SessionStates.ALL })
  readonly session_status: string;

  @ApiProperty({ enum: PaymentStatuses.ALL })
  readonly payment_status: string;

  @ApiProperty({ example: 'Acme Charging', description: 'The company the driver pays' })
  readonly operator_name: string;

  @ApiProperty({ example: 'Riverside' })
  readonly site_name: string;

  @ApiProperty({ example: 'CP-RIVER-1' })
  readonly charger_identity: string;

  @ApiProperty({ example: 'A' })
  readonly connector_label: string;

  @ApiProperty({
    example: 'Europe/London',
    description: 'The site’s time zone, for the times below',
  })
  readonly time_zone: string;

  @ApiProperty({ description: 'When the driver asked to charge' })
  readonly started_at: string;

  @ApiProperty({ nullable: true, description: 'When the charge stopped' })
  readonly ended_at: string | null;

  @ApiProperty({ example: 'GBP' })
  readonly currency: string;

  @ApiProperty({ description: 'Held on the card at the start' })
  readonly hold_amount: number;

  @ApiProperty({ nullable: true, description: 'The cost so far, or the amount taken at the end' })
  readonly amount: number | null;

  @ApiProperty()
  readonly energy_wh: number;

  @ApiProperty({ nullable: true, example: 'visa' })
  readonly card_brand: string | null;

  @ApiProperty({ nullable: true, example: '4242' })
  readonly card_last4: string | null;

  @ApiProperty({ nullable: true, description: 'Why the card was refused, in the provider’s words' })
  readonly failure_message: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Why the session ended without a charge, when it did',
  })
  readonly failure_reason: string | null;

  @ApiProperty({ description: 'True while the driver may ask the charger to stop' })
  readonly can_stop: boolean;

  @ApiProperty({
    description: 'True once a stop was asked for and the charger has not stopped yet',
  })
  readonly is_stop_requested: boolean;

  @ApiProperty({
    type: ChargeReceiptDto,
    nullable: true,
    description: 'Once the final price is known',
  })
  readonly receipt: ChargeReceiptDto | null;

  @ApiProperty({
    nullable: true,
    description: 'For the provider’s card form, while the hold waits',
  })
  readonly client_secret: string | null;

  @ApiProperty({ nullable: true })
  readonly publishable_key: string | null;

  @ApiProperty({ description: 'The connected account the card form must be opened for' })
  readonly provider_account_id: string;

  constructor(payment: PaymentRow, session: SessionRow, details: ChargeDetails) {
    this.charge_key = details.chargeKey;
    this.session_id = session.id;
    this.session_status = session.status;
    this.payment_status = payment.status;
    this.operator_name = details.operatorName;
    this.site_name = details.siteName;
    this.charger_identity = details.chargerIdentity;
    this.connector_label = details.connectorLabel;
    this.time_zone = session.timeZone;
    this.started_at = session.startedAt.toISOString();
    this.ended_at = session.endedAt?.toISOString() ?? null;
    this.currency = payment.currency;
    this.hold_amount = payment.holdAmount;
    this.amount = payment.capturedAmount ?? session.grossAmount;
    this.energy_wh = session.energyWh;
    this.card_brand = payment.cardBrand;
    this.card_last4 = payment.cardLast4;
    this.failure_message = payment.failureMessage;
    this.failure_reason = details.outcome.failureReason;
    this.can_stop = SessionStates.isActive(session.status) && session.ocppTransactionId !== null;
    this.is_stop_requested = details.isStopRequested;
    this.receipt = details.outcome.pricedAt
      ? new ChargeReceiptDto(details.outcome, details.outcome.pricedAt)
      : null;
    this.client_secret = details.clientSecret;
    this.publishable_key = details.publishableKey;
    this.provider_account_id = payment.providerAccountId;
  }
}
