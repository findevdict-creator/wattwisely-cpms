import { TestData, TestDrivers, TestPerson, TestTariffs } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/**
 * The stage for module 19's charging specs: Acme Charging with an Owner, a priced site with an
 * online charger and three plugs, an active payment account, Dana (invited and linked as one of
 * Acme's drivers) and Guy (a login Acme has never heard of).
 */
export class DriverChargesFixture {
  static readonly DANA = { keycloakId: 'kc-dana', email: 'dana@example.com', name: 'Dana' };
  static readonly GUY = { keycloakId: 'kc-guy', email: 'guy@example.com', name: 'Guy Guest' };
  static readonly CHARGER = 'CP-DRV-1';

  readonly api = new TestApi();
  readonly drivers = new TestDrivers(this.api.data);
  acme = '';
  owner = '';
  riverside = '';
  chargerId = '';
  danaToken = '';
  guyToken = '';
  danaDriverId = '';
  providerAccountId = '';

  async start(): Promise<void> {
    await this.api.start();
    this.acme = await this.api.data.tenant('acme-charging');
    this.owner = await this.tokenFor('olivia@acme.test', TestData.ROLE_IDS.owner);
    this.riverside = await this.api.data.site(this.acme, 'Riverside');
    await this.api.data.sql(`update sites set visibility = 'public' where id = $1`, [
      this.riverside,
    ]);
    this.chargerId = await this.api.data.charger(
      this.acme,
      this.riverside,
      DriverChargesFixture.CHARGER,
    );
    for (const number of [1, 2, 3]) {
      await this.api.data.connector(this.acme, this.chargerId, number);
    }
    await this.api.addons.chargerOnline(this.acme, this.chargerId);
    const tariffs = new TestTariffs(this.api.data);
    const tariff = await tariffs.create(this.acme, 'Standard');
    await tariffs.assign(this.riverside, tariff.tariffId);
    await this.connectedAccount();
    this.danaToken = await this.api.issuer.signForDriver(DriverChargesFixture.DANA);
    this.guyToken = await this.api.issuer.signForDriver(DriverChargesFixture.GUY);
    await this.linkDana();
  }

  stop(): Promise<void> {
    return this.api.stop();
  }

  /** The plug as the driver sees it. */
  place(token: string, connector = 1) {
    return this.api.call('GET', `/v1/driver/places/${DriverChargesFixture.CHARGER}/${connector}`, {
      token,
    });
  }

  /** The driver starts on one of the charger's plugs from the app. */
  startCharge(token: string, connector: number, isConsentGiven?: boolean) {
    return this.api.call('POST', '/v1/driver/charges', {
      token,
      body: {
        charger_identity: DriverChargesFixture.CHARGER,
        ocpp_connector_id: connector,
        is_consent_given: isConsentGiven,
      },
    });
  }

  /** The driver saves a card: the setup is opened, "typed into" with the fake provider, and posted back. */
  async saveCard(
    token: string,
    card?: { brand: string; last4: string; expMonth: number; expYear: number },
  ) {
    const setup = await this.api.call('POST', '/v1/driver/payment-methods/setup', { token });
    this.api.gateway.savedCards.completeSetup(setup.json().setup_id, card);
    return this.api.call('POST', '/v1/driver/payment-methods', {
      token,
      body: { setup_id: setup.json().setup_id },
    });
  }

  /** The charger reports the transaction running, as the gateway would have recorded it. */
  async running(sessionId: string, ocppTransactionId: number): Promise<void> {
    await this.api.data.sql(
      `update charging_sessions set status = 'charging', ocpp_transaction_id = $2 where id = $1`,
      [sessionId, ocppTransactionId],
    );
  }

  /** A meter reading of the running session, 64% battery, as the gateway would store it (module 32). */
  async reading(sessionId: string, meterWh: number, powerW: number): Promise<void> {
    await this.api.data.sql(
      `insert into meter_values (id, tenant_id, charger_id, session_id, measured_at, energy_wh, power_w, soc_percent, samples)
       select gen_random_uuid(), tenant_id, charger_id, id, now(), $2, $3, 64, '[]'::jsonb
       from charging_sessions where id = $1`,
      [sessionId, meterWh, powerW],
    );
  }

  async commandsFor(sessionId: string): Promise<string[]> {
    const { rows } = await this.api.data.sql(
      `select action from charger_commands where payload->>'session_id' = $1::text or id = (select command_id from charging_sessions where id = $1::uuid) order by created_at`,
      [sessionId],
    );
    return rows.map((row) => row.action as string);
  }

  private async connectedAccount(): Promise<void> {
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
  }

  /** Dana is one of Acme's drivers, invited by the Owner and linked through the invitation. */
  private async linkDana(): Promise<void> {
    const created = await this.api.call('POST', '/v1/drivers', {
      token: this.owner,
      body: { name: 'Dana Driver', email: DriverChargesFixture.DANA.email, reference: 'EMP-42' },
    });
    this.danaDriverId = created.json().id;
    await this.api.call('POST', `/v1/drivers/${this.danaDriverId}/invite`, {
      token: this.owner,
      body: {},
    });
    const token = this.api.mail.lastInvitationToken(DriverChargesFixture.DANA.email);
    await this.api.call('POST', `/v1/driver/invitations/${token}/accept`, {
      token: this.danaToken,
    });
  }

  private async tokenFor(email: string, roleId: string): Promise<string> {
    const person: TestPerson = await this.api.data.person(email, email.split('@')[0]);
    await this.api.data.member(this.acme, person, roleId);
    return this.api.issuer.signFor(person);
  }
}
