import { Inject, Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import {
  AccountState,
  AccountStatusPolicy,
  PAYMENT_GATEWAY,
  PaymentAccountRow,
  PaymentAccountStore,
  PaymentGateway,
} from '@wattwisely/payments';
import { AuditRecorder } from '../../../common/audit/audit.recorder';
import { SitePermissionChecker } from '../../../common/permissions/site-permission.checker';
import { VersionConflict } from '../../../common/problem/version-conflict';
import { RequestAuth } from '../../../common/request/request-auth';
import { TenantAccess } from '../../../common/tenant/tenant-access';
import { ApiConfig } from '../../../config/api.config';
import { PaymentErrors } from '../payment-errors';
import { AccountLinkDto } from './dto/account-link.dto';
import { ConnectAccountRequestDto } from './dto/connect-account-request.dto';
import { PaymentAccountDto } from './dto/payment-account.dto';
import { UpdateHoldRequestDto } from './dto/update-hold-request.dto';

/**
 * The company's connected account at the payment provider (Stripe Payments design,
 * "Tenant onboarding"). Connecting opens an Express account; Stripe's own hosted pages
 * then collect the company's details, and webhooks (or Refresh) keep the status here current.
 */
@Injectable()
export class PaymentAccountService {
  private readonly accounts = new PaymentAccountStore();

  constructor(
    private readonly runner: TransactionRunner,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
    private readonly config: ApiConfig,
    private readonly audit: AuditRecorder,
  ) {}

  async get(access: TenantAccess): Promise<PaymentAccountDto> {
    const account = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.accounts.findCurrent(tx),
    );
    return this.dto(account);
  }

  async connect(auth: RequestAuth, body: ConnectAccountRequestDto): Promise<PaymentAccountDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'settings:payments');
    const session = DatabaseSession.forTenant(access.tenant.id);
    if (await this.runner.run(session, (tx) => this.accounts.findCurrent(tx))) {
      throw PaymentErrors.alreadyConnected();
    }
    const state = await this.call(() =>
      this.gateway.createAccount({
        tenantId: access.tenant.id,
        tenantName: access.tenant.name,
        country: body.country,
        email: auth.requireAccount().email,
        idempotencyKey: `account:${access.tenant.id}`,
      }),
    );
    const account = await this.runner.run(session, (tx) => this.insert(tx, auth, state));
    return this.dto(account);
  }

  private async insert(tx: Transaction, auth: RequestAuth, state: AccountState) {
    const row = await this.accounts.insert(tx, {
      id: UuidV7.create(),
      tenantId: auth.requireAccess().tenant.id,
      provider: this.gateway.provider,
      providerAccountId: state.providerAccountId,
      status: AccountStatusPolicy.statusOf(state, null),
      isChargesEnabled: state.isChargesEnabled,
      isPayoutsEnabled: state.isPayoutsEnabled,
      isDetailsSubmitted: state.isDetailsSubmitted,
      requirements: state.requirements,
      country: state.country,
      defaultCurrency: state.defaultCurrency,
      connectedBy: auth.requireAccount().id,
      lastSyncedAt: new Date(),
    });
    await this.audit.record(tx, auth, {
      action: 'payments.account_connected',
      targetType: 'payment_account',
      targetId: row.id,
      targetLabel: row.providerAccountId,
      after: { provider: row.provider, country: row.country },
    });
    return row;
  }

  async onboardingLink(access: TenantAccess): Promise<AccountLinkDto> {
    SitePermissionChecker.requireWholeTenant(access, 'settings:payments');
    const account = await this.require(access);
    const url = await this.call(() =>
      this.gateway.createOnboardingLink({
        providerAccountId: account.providerAccountId,
        refreshUrl: `${this.config.portalUrl}/payments?stripe=refresh`,
        returnUrl: `${this.config.portalUrl}/payments?stripe=return`,
      }),
    );
    return new AccountLinkDto(url);
  }

  async dashboardLink(access: TenantAccess): Promise<AccountLinkDto> {
    const account = await this.require(access);
    const url = await this.call(() => this.gateway.createDashboardLink(account.providerAccountId));
    return new AccountLinkDto(url);
  }

  /** Asks the provider for the account's current state, for when a webhook was missed. */
  async refresh(access: TenantAccess): Promise<PaymentAccountDto> {
    const account = await this.require(access);
    const state = await this.call(() => this.gateway.getAccount(account.providerAccountId));
    const synced = await this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) =>
      this.accounts.sync(tx, account, state, new Date()),
    );
    return this.dto(synced);
  }

  async updateHold(
    auth: RequestAuth,
    version: number,
    body: UpdateHoldRequestDto,
  ): Promise<PaymentAccountDto> {
    const access = auth.requireAccess();
    SitePermissionChecker.requireWholeTenant(access, 'settings:payments');
    const account = await this.runner.run(
      DatabaseSession.forTenant(access.tenant.id),
      async (tx) => {
        const current = await this.requireIn(tx);
        if (!(await this.accounts.updateHold(tx, current.id, version, body.hold_amount))) {
          throw VersionConflict.exception();
        }
        await this.audit.record(tx, auth, {
          action: 'payments.hold_changed',
          targetType: 'payment_account',
          targetId: current.id,
          targetLabel: current.providerAccountId,
          before: { hold_amount: current.holdAmount },
          after: { hold_amount: body.hold_amount },
        });
        return this.requireIn(tx);
      },
    );
    return this.dto(account);
  }

  private async require(access: TenantAccess): Promise<PaymentAccountRow> {
    return this.runner.run(DatabaseSession.forTenant(access.tenant.id), (tx) => this.requireIn(tx));
  }

  private async requireIn(tx: Transaction): Promise<PaymentAccountRow> {
    const account = await this.accounts.findCurrent(tx);
    if (!account) {
      throw PaymentErrors.notConnected();
    }
    return account;
  }

  /** A provider call, with its failure turned into a problem. */
  private async call<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      throw PaymentErrors.fromGateway(error);
    }
  }

  private dto(account: PaymentAccountRow | null): PaymentAccountDto {
    return new PaymentAccountDto(account, this.gateway.isEnabled);
  }
}
