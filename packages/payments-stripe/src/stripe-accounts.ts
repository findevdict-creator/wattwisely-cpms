import Stripe from 'stripe';
import { AccountLinkRequest, AccountRequest, AccountState } from '@wattwisely/payments';
import { StripeMapper } from './stripe-mapper';

/** Tenants' Express accounts at Stripe Connect, and the hosted pages that onboard and show them. */
export class StripeAccounts {
  constructor(private readonly stripe: Stripe) {}

  async create(request: AccountRequest): Promise<AccountState> {
    const account = await this.stripe.accounts.create(
      {
        type: 'express',
        country: request.country,
        email: request.email ?? undefined,
        business_profile: { name: request.tenantName },
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
        metadata: { tenantId: request.tenantId },
      },
      { idempotencyKey: request.idempotencyKey },
    );
    return StripeMapper.account(account);
  }

  async get(providerAccountId: string): Promise<AccountState> {
    return StripeMapper.account(await this.stripe.accounts.retrieve(providerAccountId));
  }

  async onboardingLink(request: AccountLinkRequest): Promise<string> {
    const link = await this.stripe.accountLinks.create({
      account: request.providerAccountId,
      refresh_url: request.refreshUrl,
      return_url: request.returnUrl,
      type: 'account_onboarding',
    });
    return link.url;
  }

  async dashboardLink(providerAccountId: string): Promise<string> {
    const link = await this.stripe.accounts.createLoginLink(providerAccountId);
    return link.url;
  }
}
