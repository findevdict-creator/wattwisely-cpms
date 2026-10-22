import { createHash } from 'node:crypto';
import { UuidV7 } from '../client/uuid-v7';
import { TestData } from './test-data';

/** A connected account as a test wants it; anything left out is an active, fully enabled account. */
export interface TestAccountOptions {
  providerAccountId?: string;
  status?: 'pending' | 'active' | 'restricted';
  isChargesEnabled?: boolean;
  holdAmount?: number;
  country?: string;
}

/** A payment as the API would have stored it after the hold; anything left out is an authorised 50.00 hold. */
export interface TestPaymentOptions {
  status?: string;
  holdAmount?: number;
  authorizedAmount?: number | null;
  capturedAmount?: number | null;
  currency?: string;
  providerAccountId?: string;
  providerPaymentId?: string;
  accessKey?: string;
  nextAttemptAt?: string | null;
  autoStopRequestedAt?: string | null;
}

/** Payment accounts and payments for tests, written directly like the seed scripts do. */
export class TestPayments {
  static readonly ACCESS_KEY = 'test-access-key';

  constructor(private readonly data: TestData) {}

  static hashOf(accessKey: string): string {
    return createHash('sha256').update(accessKey).digest('hex');
  }

  async account(tenantId: string, options: TestAccountOptions = {}): Promise<string> {
    const id = UuidV7.create();
    const status = options.status ?? 'active';
    await this.data.sql(
      `insert into payment_accounts (id, tenant_id, provider_account_id, status, is_charges_enabled,
         is_payouts_enabled, is_details_submitted, country, default_currency, hold_amount)
       values ($1, $2, $3, $4, $5, $5, $5, $6, 'gbp', $7)`,
      [
        id,
        tenantId,
        options.providerAccountId ?? `acct_${id.replace(/-/g, '').slice(0, 16)}`,
        status,
        options.isChargesEnabled ?? status === 'active',
        options.country ?? 'GB',
        options.holdAmount ?? 5000,
      ],
    );
    return id;
  }

  static readonly DEFAULT_PAYMENT: Required<TestPaymentOptions> = {
    status: 'authorised',
    holdAmount: 5000,
    authorizedAmount: 5000,
    capturedAmount: null,
    currency: 'GBP',
    providerAccountId: 'acct_test',
    providerPaymentId: '',
    accessKey: TestPayments.ACCESS_KEY,
    nextAttemptAt: null,
    autoStopRequestedAt: null,
  };

  async payment(
    tenantId: string,
    sessionId: string,
    options: TestPaymentOptions = {},
  ): Promise<string> {
    const id = UuidV7.create();
    const row = { ...TestPayments.DEFAULT_PAYMENT, ...options };
    await this.data.sql(
      `insert into payments (id, tenant_id, session_id, status, currency, hold_amount, authorized_amount,
         captured_amount, provider_account_id, provider_payment_id, access_key_hash, authorized_at,
         next_attempt_at, auto_stop_requested_at)
       values ($1, $2, $3, $4::payment_status, $5, $6, $7, $8, $9, $10, $11,
         case when $4::text = 'pending' then null else now() end, $12, $13)`,
      [id, tenantId, sessionId, ...TestPayments.valuesOf(id, row)],
    );
    await this.data.sql('update charging_sessions set is_paid = true where id = $1', [sessionId]);
    return id;
  }

  private static valuesOf(id: string, row: Required<TestPaymentOptions>): unknown[] {
    return [
      row.status,
      row.currency,
      row.holdAmount,
      row.authorizedAmount,
      row.capturedAmount,
      row.providerAccountId,
      row.providerPaymentId || `pi_${id.replace(/-/g, '')}`,
      TestPayments.hashOf(row.accessKey),
      row.nextAttemptAt,
      row.autoStopRequestedAt,
    ];
  }
}
