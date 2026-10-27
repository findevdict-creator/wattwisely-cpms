import { TestData, TestDatabase, TestPerson } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Wattwisely staff (an admin and Sam from support) and the Acme tenant with its Owner, for the managed service tests. */
export class ManagedFixture {
  readonly api = new TestApi();
  adminToken!: string;
  adminStaffId!: string;
  viewerToken!: string;
  sam!: TestPerson;
  samStaffId!: string;
  samToken!: string;
  acme!: string;
  site!: string;
  olivia!: TestPerson;
  ownerToken!: string;

  async start(): Promise<void> {
    await this.api.start();
    const admin = await this.api.data.person('ana@wattwisely.test', 'Ana Admin');
    this.adminStaffId = await this.api.platform.staff(admin, 'admin');
    this.adminToken = await this.api.issuer.signFor(admin);
    const viewer = await this.api.data.person('vic@wattwisely.test', 'Vic Viewer');
    await this.api.platform.staff(viewer, 'viewer');
    this.viewerToken = await this.api.issuer.signFor(viewer);
    this.sam = await this.api.data.person('sam@wattwisely.test', 'Sam Support');
    this.samStaffId = await this.api.platform.staff(this.sam, 'support');
    this.samToken = await this.api.issuer.signFor(this.sam);
    this.acme = await this.api.data.tenant('acme-charging');
    this.site = await this.api.data.site(this.acme, 'Riverside');
    this.olivia = await this.api.data.person('olivia@acme.test', 'Olivia Owner');
    await this.api.data.member(this.acme, this.olivia, TestData.ROLE_IDS.owner);
    this.ownerToken = await this.api.issuer.signFor(this.olivia);
  }

  stop(): Promise<void> {
    return this.api.stop();
  }

  asAdmin(body?: object, version?: number) {
    return { token: this.adminToken, body, version };
  }

  asOwner(body?: object, version?: number) {
    return { token: this.ownerToken, body, version };
  }

  /** Sam inside Acme, as its Managed operator. */
  asSam(body?: object, version?: number) {
    return { token: this.samToken, tenantId: this.acme, body, version };
  }

  /** The e-mails sent to Olivia so far, newest last. */
  mailsToOwner(): string[] {
    return this.api.mail.sent
      .filter((message) => message.to === this.olivia.email)
      .map((message) => message.subject);
  }

  static isConfigured(): boolean {
    return TestDatabase.isConfigured();
  }
}
