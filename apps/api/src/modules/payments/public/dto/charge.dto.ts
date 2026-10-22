import { ApiProperty } from '@nestjs/swagger';
import { PaymentRow, PaymentStatuses } from '@wattwisely/payments';
import { SessionRow, SessionStates } from '@wattwisely/session-engine';

/** What the driver's page needs besides the payment and session rows. */
export interface ChargeDetails {
  chargeKey: string;
  chargerIdentity: string;
  connectorLabel: string;
  /** Only while the hold waits for the card; the page confirms it with the provider's form. */
  clientSecret: string | null;
  publishableKey: string | null;
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

  @ApiProperty({ example: 'CP-RIVER-1' })
  readonly charger_identity: string;

  @ApiProperty({ example: 'A' })
  readonly connector_label: string;

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
    this.charger_identity = details.chargerIdentity;
    this.connector_label = details.connectorLabel;
    this.currency = payment.currency;
    this.hold_amount = payment.holdAmount;
    this.amount = payment.capturedAmount ?? session.grossAmount;
    this.energy_wh = session.energyWh;
    this.card_brand = payment.cardBrand;
    this.card_last4 = payment.cardLast4;
    this.failure_message = payment.failureMessage;
    this.client_secret = details.clientSecret;
    this.publishable_key = details.publishableKey;
    this.provider_account_id = payment.providerAccountId;
  }
}
