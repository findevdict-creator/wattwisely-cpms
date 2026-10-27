import { Inject, Injectable } from '@nestjs/common';
import { DatabaseSession, Transaction, TransactionRunner, UuidV7 } from '@wattwisely/db';
import {
  PAYMENT_GATEWAY,
  PaymentGateway,
  PaymentGatewayError,
  PaymentMethodRow,
  PaymentMethodStore,
} from '@wattwisely/payments';
import { DriverAccount } from '../../../common/account/driver-account';
import { RequestAuth } from '../../../common/request/request-auth';
import { PaymentErrors } from '../../payments/payment-errors';
import { DriverAppErrors } from '../driver-app-errors';
import { CardSetupDto } from './dto/card-setup.dto';
import { PaymentMethodDto } from './dto/payment-method.dto';
import { PaymentMethodsDto } from './dto/payment-methods.dto';
import { SavePaymentMethodRequestDto } from './dto/save-payment-method-request.dto';
import { UpdatePaymentMethodRequestDto } from './dto/update-payment-method-request.dto';

/**
 * The cards a driver saves to their account (module 19, decision 2): one customer per driver on
 * the platform's own provider account, so one saved card works at every operator. The card
 * itself never passes through the API: the provider's form takes it against a setup the API
 * opened, and the API reads the result back and keeps only what the app shows.
 */
@Injectable()
export class DriverPaymentMethodsService {
  private readonly store = new PaymentMethodStore();

  constructor(
    private readonly runner: TransactionRunner,
    @Inject(PAYMENT_GATEWAY) private readonly gateway: PaymentGateway,
  ) {}

  async list(auth: RequestAuth): Promise<PaymentMethodsDto> {
    const rows = await this.run((tx) => this.store.findAll(tx, auth.requireDriver().id));
    return new PaymentMethodsDto(rows, this.gateway.isEnabled);
  }

  async setup(auth: RequestAuth): Promise<CardSetupDto> {
    const account = auth.requireDriver();
    if (!this.gateway.isEnabled) {
      throw PaymentErrors.fromGateway(PaymentGatewayError.unavailable());
    }
    const customerId = await this.customerOf(account);
    const setup = await this.call(() =>
      this.gateway.createCardSetup({ customerId, idempotencyKey: `setup:${UuidV7.create()}` }),
    );
    return new CardSetupDto(
      setup.providerSetupId,
      setup.clientSecret,
      this.gateway.publishableKey(),
    );
  }

  /** The form confirmed the card: the setup is read back and the card kept. The first card becomes the default. */
  async save(auth: RequestAuth, body: SavePaymentMethodRequestDto): Promise<PaymentMethodDto> {
    const account = auth.requireDriver();
    const state = await this.call(() => this.gateway.getCardSetup(body.setup_id));
    if (state.status !== 'succeeded' || !state.card) {
      throw DriverAppErrors.cardSetupIncomplete(state.failureMessage);
    }
    const card = state.card;
    const row = await this.run(async (tx) => {
      const existing = await this.store.findByProviderMethod(tx, card.providerPaymentMethodId);
      if (existing) {
        return existing;
      }
      return this.store.insert(tx, {
        id: UuidV7.create(),
        driverAccountId: account.id,
        provider: this.gateway.provider,
        card,
      });
    });
    return new PaymentMethodDto(row);
  }

  async makeDefault(
    auth: RequestAuth,
    id: string,
    body: UpdatePaymentMethodRequestDto,
  ): Promise<PaymentMethodDto> {
    const account = auth.requireDriver();
    const row = await this.run(async (tx) => {
      const card = await this.require(tx, account.id, id);
      if (body.is_default && !card.isDefault) {
        await this.store.setDefault(tx, account.id, id);
      }
      return this.require(tx, account.id, id);
    });
    return new PaymentMethodDto(row);
  }

  /** The provider forgets the card too; a hold already taken from it is unaffected. */
  async remove(auth: RequestAuth, id: string): Promise<void> {
    const account = auth.requireDriver();
    const card = await this.run((tx) => this.require(tx, account.id, id));
    await this.call(() => this.gateway.detachCard(card.providerPaymentMethodId));
    await this.run((tx) => this.store.remove(tx, account.id, id));
  }

  /** The driver's customer at the provider, opened on the first card. */
  private async customerOf(account: DriverAccount): Promise<string> {
    const known = await this.run((tx) => this.store.customerOf(tx, account.id));
    if (known) {
      return known;
    }
    const customerId = await this.call(() =>
      this.gateway.createCustomer({
        driverAccountId: account.id,
        email: account.email,
        name: account.displayName,
        idempotencyKey: `customer:${account.id}`,
      }),
    );
    await this.run((tx) => this.store.saveCustomer(tx, account.id, customerId));
    return customerId;
  }

  private async require(tx: Transaction, accountId: string, id: string): Promise<PaymentMethodRow> {
    const card = UuidV7.isUuid(id) ? await this.store.findById(tx, accountId, id) : null;
    if (!card || card.status !== 'active') {
      throw DriverAppErrors.cardNotFound();
    }
    return card;
  }

  /** The global tables only: driver_accounts and payment_methods have no tenant. */
  private run<T>(work: (tx: Transaction) => Promise<T>): Promise<T> {
    return this.runner.run(DatabaseSession.anonymous(), work);
  }

  private async call<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch (error) {
      throw PaymentErrors.fromGateway(error);
    }
  }
}
