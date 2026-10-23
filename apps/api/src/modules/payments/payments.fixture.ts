import { TestData, TestPerson, TestTariffs } from '@wattwisely/db/testing';
import { FakePaymentGateway } from '@wattwisely/payments/testing';
import { TestApi } from '../../testing/test-api';

/** A company with an owner, a priced site and a charger with three plugs, for the payment tests. */
export class PaymentsFixture {
  readonly api = new TestApi();
  acme!: string;
  ownerToken!: string;
  riverside!: string;
  chargerId!: string;
  providerAccountId!: string;

  async start(): Promise<void> {
    await this.api.start();
    this.acme = await this.api.data.tenant('acme-charging');
    this.ownerToken = await this.tokenFor('olivia@acme.test', TestData.ROLE_IDS.owner);
    this.riverside = await this.api.data.site(this.acme, 'Riverside');
    this.chargerId = await this.api.data.charger(this.acme, this.riverside, 'CP-PAY-1');
    for (const number of [1, 2, 3]) {
      await this.api.data.connector(this.acme, this.chargerId, number);
    }
    const tariffs = new TestTariffs(this.api.data);
    const tariff = await tariffs.create(this.acme, 'Standard');
    await tariffs.assign(this.riverside, tariff.tariffId);
  }

  async stop(): Promise<void> {
    await this.api.stop();
  }

  async tokenFor(email: string, roleId: string, siteId: string | null = null): Promise<string> {
    const person: TestPerson = await this.api.data.person(email, email.split('@')[0]);
    await this.api.data.member(this.acme, person, roleId, siteId);
    return this.api.issuer.signFor(person);
  }

  asOwner(body?: object) {
    return { token: this.ownerToken, body };
  }

  /** An active connected account, as if onboarding had been finished earlier. */
  async connectedAccount(): Promise<string> {
    const account = await this.api.gateway.createAccount({
      tenantId: this.acme,
      tenantName: 'Acme',
      country: 'GB',
      email: null,
      idempotencyKey: `account:${this.acme}`,
    });
    this.api.gateway.enable(account.providerAccountId);
    this.providerAccountId = account.providerAccountId;
    await this.api.payments.account(this.acme, { providerAccountId: this.providerAccountId });
    return this.providerAccountId;
  }

  /** A signed webhook delivery from the provider in memory. */
  webhook(body: object, signature = FakePaymentGateway.SIGNATURE) {
    return this.api.call('POST', '/v1/webhooks/stripe', {
      rawBody: JSON.stringify(body),
      headers: { 'stripe-signature': signature },
    });
  }

  /** A driver's start on one of the charger's plugs. */
  startCharge(ocppConnectorId: number) {
    return this.api.call('POST', '/v1/public/charges', {
      body: { charger_identity: 'CP-PAY-1', ocpp_connector_id: ocppConnectorId },
    });
  }
}
