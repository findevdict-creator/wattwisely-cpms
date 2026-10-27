import { BillingPeriod } from '@wattwisely/billing';
import { TestData, TestDatabase, TestPerson, TestPlatform } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/**
 * For the invoice tests: Ana (admin) and Vic (viewer) at Wattwisely; Acme on the Growth plan
 * for three months with two AC and one DC connector, the load management add-on, a managed
 * service at 250.00 a month and 20 % tax; Olivia its Owner, Fred in Finance.
 */
export class InvoicesFixture {
  static readonly THREE_MONTHS_MS = 92 * 86_400_000;

  readonly api = new TestApi();
  readonly now = new Date();
  readonly lastMonth = BillingPeriod.before(this.now);
  adminToken!: string;
  viewerToken!: string;
  acme!: string;
  subscriptionId!: string;
  olivia!: TestPerson;
  ownerToken!: string;
  financeToken!: string;

  async start(): Promise<void> {
    await this.api.start();
    const startedAt = new Date(this.now.getTime() - InvoicesFixture.THREE_MONTHS_MS);
    const ana = await this.api.data.person('ana@wattwisely.test', 'Ana Admin');
    const anaStaffId = await this.api.platform.staff(ana, 'admin');
    this.adminToken = await this.api.issuer.signFor(ana);
    const vic = await this.api.data.person('vic@wattwisely.test', 'Vic Viewer');
    await this.api.platform.staff(vic, 'viewer');
    this.viewerToken = await this.api.issuer.signFor(vic);
    this.acme = await this.api.data.tenant('acme-charging');
    this.subscriptionId = await this.api.platform.subscription(
      this.acme,
      TestPlatform.PLAN_IDS.growth,
      'active',
      { startedAt, taxRateBps: 2_000, billingEmail: 'accounts@acme.test', billingName: 'Acme' },
    );
    await this.api.platform.entitlement(this.acme, 'load_management', 'addon');
    await this.api.data.sql('update tenant_entitlements set created_at = $1 where tenant_id = $2', [
      startedAt,
      this.acme,
    ]);
    await this.api.managed.service(this.acme, anaStaffId, 'active', {
      acceptedAt: startedAt,
      monthlyFee: 25_000,
    });
    await this.connectors();
    await this.people();
  }

  private async connectors(): Promise<void> {
    const site = await this.api.data.site(this.acme, 'Riverside');
    const charger = await this.api.data.charger(this.acme, site, 'ACME-1');
    for (const connector of [1, 2, 3]) {
      const id = await this.api.data.connector(this.acme, charger, connector);
      await this.api.data.sql('update connectors set current_type = $2 where id = $1', [
        id,
        connector === 3 ? 'dc' : 'ac',
      ]);
    }
  }

  private async people(): Promise<void> {
    this.olivia = await this.api.data.person('olivia@acme.test', 'Olivia Owner');
    await this.api.data.member(this.acme, this.olivia, TestData.ROLE_IDS.owner);
    this.ownerToken = await this.api.issuer.signFor(this.olivia);
    const fred = await this.api.data.person('fred@acme.test', 'Fred Finance');
    await this.api.data.member(this.acme, fred, TestData.ROLE_IDS.technician);
    this.financeToken = await this.api.issuer.signFor(fred);
  }

  stop(): Promise<void> {
    return this.api.stop();
  }

  asAdmin(body?: object, version?: number) {
    return { token: this.adminToken, body, version };
  }

  asViewer(body?: object, version?: number) {
    return { token: this.viewerToken, body, version };
  }

  asOwner() {
    return { token: this.ownerToken, tenantId: this.acme };
  }

  /** Fred is a Technician: no invoices:read. */
  asTechnician() {
    return { token: this.financeToken, tenantId: this.acme };
  }

  /** Staff draft last month's invoice for Acme by hand. */
  async draft(month = this.lastMonth.key) {
    const response = await this.api.call(
      'POST',
      `/v1/admin/tenants/${this.acme}/invoices`,
      this.asAdmin({ month }),
    );
    if (response.statusCode !== 201) {
      throw new Error(`Drafting ${month} failed: ${response.statusCode} ${response.json().code}`);
    }
    return response.json();
  }

  /** The subjects of the e-mails sent to Acme's billing address so far. */
  billingMails(): string[] {
    return this.api.mail.sent
      .filter((message) => message.to === 'accounts@acme.test')
      .map((message) => message.subject);
  }

  /** The audit actions recorded in Acme's log for invoices, oldest first. */
  async auditActions(): Promise<string[]> {
    const { rows } = await this.api.data.sql(
      `select action from audit_log where tenant_id = $1 and target_type = 'invoice' order by occurred_at, id`,
      [this.acme],
    );
    return rows.map((row) => (row as { action: string }).action);
  }

  static isConfigured(): boolean {
    return TestDatabase.isConfigured();
  }
}
