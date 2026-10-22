import { ApiProperty } from '@nestjs/swagger';
import { PaymentAccountRow } from '@wattwisely/payments';

/** How far the company's Stripe account has come. */
export type PaymentAccountState = 'not_connected' | 'pending' | 'active' | 'restricted';

/** GET /v1/payment-account: the company's connected account, or that there is none yet. */
export class PaymentAccountDto {
  @ApiProperty({ enum: ['not_connected', 'pending', 'active', 'restricted'] })
  readonly status: PaymentAccountState;

  @ApiProperty({ description: 'False when this installation has no payment provider keys' })
  readonly is_provider_enabled: boolean;

  @ApiProperty({ nullable: true, example: 'stripe' })
  readonly provider: string | null;

  @ApiProperty({ nullable: true, example: 'acct_1Nv0FGQ9RKHgCVdK' })
  readonly provider_account_id: string | null;

  @ApiProperty()
  readonly is_charges_enabled: boolean;

  @ApiProperty()
  readonly is_payouts_enabled: boolean;

  @ApiProperty()
  readonly is_details_submitted: boolean;

  @ApiProperty({ type: [String], description: 'What Stripe still needs, in its own words' })
  readonly requirements_due: string[];

  @ApiProperty({ nullable: true, example: 'requirements.past_due' })
  readonly disabled_reason: string | null;

  @ApiProperty({ nullable: true, example: 'GB' })
  readonly country: string | null;

  @ApiProperty({ nullable: true, example: 'gbp' })
  readonly default_currency: string | null;

  @ApiProperty({ nullable: true, description: 'The hold on a card at the start, minor units' })
  readonly hold_amount: number | null;

  @ApiProperty({ nullable: true })
  readonly last_synced_at: string | null;

  @ApiProperty({ nullable: true })
  readonly connected_at: string | null;

  @ApiProperty({ nullable: true, description: 'Send as If-Match when changing the hold' })
  readonly version: number | null;

  constructor(account: PaymentAccountRow | null, isProviderEnabled: boolean) {
    this.is_provider_enabled = isProviderEnabled;
    const flags = account ? PaymentAccountDto.flagsOf(account) : PaymentAccountDto.NO_FLAGS;
    this.status = flags.status;
    this.is_charges_enabled = flags.isChargesEnabled;
    this.is_payouts_enabled = flags.isPayoutsEnabled;
    this.is_details_submitted = flags.isDetailsSubmitted;
    this.requirements_due = flags.requirementsDue;
    this.disabled_reason = flags.disabledReason;
    const details = account ? PaymentAccountDto.detailsOf(account) : PaymentAccountDto.NO_DETAILS;
    this.provider = details.provider;
    this.provider_account_id = details.providerAccountId;
    this.country = details.country;
    this.default_currency = details.defaultCurrency;
    this.hold_amount = details.holdAmount;
    this.last_synced_at = details.lastSyncedAt;
    this.connected_at = details.connectedAt;
    this.version = details.version;
  }

  private static readonly NO_FLAGS = {
    status: 'not_connected' as PaymentAccountState,
    isChargesEnabled: false,
    isPayoutsEnabled: false,
    isDetailsSubmitted: false,
    requirementsDue: [] as string[],
    disabledReason: null as string | null,
  };

  private static readonly NO_DETAILS = {
    provider: null as string | null,
    providerAccountId: null as string | null,
    country: null as string | null,
    defaultCurrency: null as string | null,
    holdAmount: null as number | null,
    lastSyncedAt: null as string | null,
    connectedAt: null as string | null,
    version: null as number | null,
  };

  private static flagsOf(account: PaymentAccountRow): typeof PaymentAccountDto.NO_FLAGS {
    return {
      status: account.status,
      isChargesEnabled: account.isChargesEnabled,
      isPayoutsEnabled: account.isPayoutsEnabled,
      isDetailsSubmitted: account.isDetailsSubmitted,
      requirementsDue: [...account.requirements.pastDue, ...account.requirements.currentlyDue],
      disabledReason: account.requirements.disabledReason,
    };
  }

  private static detailsOf(account: PaymentAccountRow): typeof PaymentAccountDto.NO_DETAILS {
    return {
      provider: account.provider,
      providerAccountId: account.providerAccountId,
      country: account.country,
      defaultCurrency: account.defaultCurrency,
      holdAmount: account.holdAmount,
      lastSyncedAt: account.lastSyncedAt?.toISOString() ?? null,
      connectedAt: account.createdAt.toISOString(),
      version: account.version,
    };
  }
}
