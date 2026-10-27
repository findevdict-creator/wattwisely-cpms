import { TestData, TestPerson } from '@wattwisely/db/testing';
import { TestApi } from '../../../testing/test-api';

/**
 * The stage for the module 19 flow specs: Acme Charging with an Owner and a Technician, the
 * driver Dana Driver with her e-mail address, and Dana's own driver app login.
 */
export class DriverAccountsFixture {
  static readonly DANA = { keycloakId: 'kc-dana', email: 'dana@example.com', name: 'Dana' };

  readonly api = new TestApi();
  acme = '';
  owner = '';
  technician = '';
  danaToken = '';
  driverId = '';

  async start(): Promise<void> {
    await this.api.start();
    this.acme = await this.api.data.tenant('acme-charging');
    this.owner = await this.tokenFor('olivia@acme.test', TestData.ROLE_IDS.owner);
    this.technician = await this.tokenFor('tom@acme.test', TestData.ROLE_IDS.technician);
    this.danaToken = await this.api.issuer.signForDriver(DriverAccountsFixture.DANA);
    const created = await this.api.call('POST', '/v1/drivers', {
      token: this.owner,
      body: { name: 'Dana Driver', email: DriverAccountsFixture.DANA.email, reference: 'EMP-42' },
    });
    this.driverId = created.json().id;
  }

  stop(): Promise<void> {
    return this.api.stop();
  }

  /** Dana's record as the operator sees it, by default through the Owner's eyes. */
  driver(token = this.owner) {
    return this.api.call('GET', `/v1/drivers/${this.driverId}`, { token });
  }

  invite(body: Record<string, unknown> = {}, token = this.owner) {
    return this.api.call('POST', `/v1/drivers/${this.driverId}/invite`, { token, body });
  }

  /** The invitation page's data, which needs no login. */
  preview(token: string) {
    return this.api.call('GET', `/v1/driver/invitations/${token}`);
  }

  /** Dana answers the newest invitation sent to her address. */
  answer(verb: 'accept' | 'decline') {
    const token = this.api.mail.lastInvitationToken(DriverAccountsFixture.DANA.email);
    return this.api.call('POST', `/v1/driver/invitations/${token}/${verb}`, {
      token: this.danaToken,
    });
  }

  /** The audit trail of Dana's record, as "action:actor_type", creation left out. */
  async auditActions(): Promise<string[]> {
    const rows = await this.api.data.sql(
      `select action, actor_type from audit_log where target_id = $1 and action like 'drivers.%' and action <> 'drivers.created' order by id`,
      [this.driverId],
    );
    return rows.rows.map((row) => `${row.action}:${row.actor_type}`);
  }

  private async tokenFor(email: string, roleId: string): Promise<string> {
    const person: TestPerson = await this.api.data.person(email, email.split('@')[0]);
    await this.api.data.member(this.acme, person, roleId);
    return this.api.issuer.signFor(person);
  }
}
