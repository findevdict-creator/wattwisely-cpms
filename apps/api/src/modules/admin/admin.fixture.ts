import { TestData, TestPerson, TestPlatform } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Wattwisely staff in three roles and one tenant with an Owner, for the admin console tests. */
export class AdminFixture {
  readonly api = new TestApi();
  adminToken!: string;
  billingToken!: string;
  viewerToken!: string;
  acme!: string;
  olivia!: TestPerson;
  ownerToken!: string;

  async start(): Promise<void> {
    await this.api.start();
    this.adminToken = await this.staffToken('ana@wattwisely.test', 'admin');
    this.billingToken = await this.staffToken('bea@wattwisely.test', 'billing');
    this.viewerToken = await this.staffToken('vic@wattwisely.test', 'viewer');
    this.acme = await this.api.data.tenant('acme-charging');
    this.olivia = await this.api.data.person('olivia@acme.test', 'Olivia Owner');
    await this.api.data.member(this.acme, this.olivia, TestData.ROLE_IDS.owner);
    await this.api.platform.subscription(this.acme, TestPlatform.PLAN_IDS.starter);
    this.ownerToken = await this.api.issuer.signFor(this.olivia);
  }

  stop(): Promise<void> {
    return this.api.stop();
  }

  async staffToken(email: string, role: string): Promise<string> {
    const person = await this.api.data.person(email, email.split('@')[0]);
    await this.api.platform.staff(person, role);
    return this.api.issuer.signFor(person);
  }

  asAdmin(body?: object, version?: number) {
    return { token: this.adminToken, body, version };
  }

  asOwner(body?: object) {
    return { token: this.ownerToken, body };
  }

  /** A tenant's current version, for If-Match. */
  async versionOf(tenantId: string): Promise<number> {
    const answer = await this.api.call('GET', `/v1/admin/tenants/${tenantId}`, this.asAdmin());
    return answer.json().version;
  }
}
