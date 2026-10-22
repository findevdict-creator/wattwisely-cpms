import { TestApi } from '../../testing/test-api';
import { TestData, TestPerson } from '../../testing/test-data';
import { TestDatabase } from '../../testing/test-database';

/** Stories ACC-02 and ACC-03 end to end: invite, accept, change roles, remove. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Team members and invitations', () => {
  const api = new TestApi();
  const { owner, technician, operations, readOnly } = TestData.ROLE_IDS;
  let acme: string;
  let olivia: TestPerson;
  let tech: TestPerson;
  let ownerToken: string;
  let site: string;

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    olivia = await api.data.person('olivia@acme.test', 'Olivia Owner');
    tech = await api.data.person('tech@acme.test', 'Theo Tech');
    await api.data.member(acme, olivia, owner);
    await api.data.member(acme, tech, technician);
    site = await api.data.site(acme, 'Riverside');
    ownerToken = await api.issuer.signFor(olivia);
  });

  afterAll(async () => api.stop());

  const asOwner = { token: '' };
  beforeEach(() => (asOwner.token = ownerToken));

  const invite = async (email: string, roles: object[]) =>
    api.call('POST', '/v1/members/invites', { ...asOwner, body: { email, roles } });

  it('lists the team with roles for anyone holding team:read', async () => {
    const response = await api.call('GET', '/v1/members', asOwner);

    expect(response.statusCode).toBe(200);
    expect(response.json().map((member: { email: string }) => member.email)).toEqual(
      expect.arrayContaining(['olivia@acme.test', 'tech@acme.test']),
    );
  });

  it('refuses team changes to a technician, who lacks team:manage', async () => {
    const token = await api.issuer.signFor(tech);

    const response = await api.call('POST', '/v1/members/invites', {
      token,
      body: { email: 'x@acme.test', roles: [{ role_id: readOnly }] },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toMatchObject({ code: 'permission_denied' });
  });

  it('invites someone, e-mails a link, and lets them accept it after logging in', async () => {
    const response = await invite('nina@acme.test', [{ role_id: operations, site_ids: [site] }]);

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({
      is_email_sent: true,
      member: {
        email: 'nina@acme.test',
        status: 'invited',
        roles: [{ role_id: operations, key: 'operations', site_ids: [site] }],
        invited_by: 'Olivia Owner',
      },
    });
    const token = api.mail.lastInvitationToken('nina@acme.test');

    const preview = await api.call('GET', `/v1/invitations/${token}`);
    expect(preview.json()).toMatchObject({ tenant_name: 'acme charging', email: 'nina@acme.test' });

    const nina = await api.issuer.sign({ sub: 'kc-nina', email: 'nina@acme.test' });
    const accepted = await api.call('POST', `/v1/invitations/${token}/accept`, { token: nina });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({ tenant: { id: acme } });

    const permissions = await api.call('GET', '/v1/me/permissions', { token: nina });
    expect(permissions.json().permissions).toContainEqual({
      key: 'chargers:command',
      site_ids: [site],
    });
  });

  it('refuses an invitation accepted by a different person or used twice', async () => {
    await invite('pat@acme.test', [{ role_id: readOnly }]);
    const token = api.mail.lastInvitationToken('pat@acme.test');
    const intruder = await api.issuer.sign({ sub: 'kc-intruder', email: 'intruder@else.test' });

    const wrongPerson = await api.call('POST', `/v1/invitations/${token}/accept`, {
      token: intruder,
    });
    expect(wrongPerson.json()).toMatchObject({ code: 'invitation_for_someone_else' });

    const pat = await api.issuer.sign({ sub: 'kc-pat', email: 'pat@acme.test' });
    await api.call('POST', `/v1/invitations/${token}/accept`, { token: pat });
    const again = await api.call('POST', `/v1/invitations/${token}/accept`, { token: pat });
    expect(again.statusCode).toBe(404);
  });

  it('refuses to invite an existing member or to grant more than the inviter holds', async () => {
    const existing = await invite('tech@acme.test', [{ role_id: readOnly }]);
    expect(existing.json()).toMatchObject({ code: 'already_member' });

    const teamAdmin = await api.data.customRole(acme, 'Team admin', ['team:read', 'team:manage']);
    const adam = await api.data.person('adam@acme.test');
    await api.data.member(acme, adam, teamAdmin);
    const admin = await api.call('POST', '/v1/members/invites', {
      token: await api.issuer.signFor(adam),
      body: { email: 'boss@acme.test', roles: [{ role_id: owner }] },
    });
    expect(admin.statusCode).toBe(403);
    expect(admin.json()).toMatchObject({ code: 'role_exceeds_own_access' });
  });

  it('resends and cancels an invitation; the old link stops working', async () => {
    const created = await invite('sam@acme.test', [{ role_id: readOnly }]);
    const id = created.json().member.id;
    const firstToken = api.mail.lastInvitationToken('sam@acme.test');

    const resent = await api.call('POST', `/v1/members/invites/${id}/resend`, asOwner);
    expect(resent.statusCode).toBe(200);
    expect((await api.call('GET', `/v1/invitations/${firstToken}`)).statusCode).toBe(404);

    const cancelled = await api.call('DELETE', `/v1/members/invites/${id}`, asOwner);
    expect(cancelled.statusCode).toBe(204);
    const secondToken = api.mail.lastInvitationToken('sam@acme.test');
    expect((await api.call('GET', `/v1/invitations/${secondToken}`)).statusCode).toBe(404);
  });

  it('keeps the invitation when the e-mail cannot be sent', async () => {
    api.mail.isFailing = true;
    const response = await invite('offline@acme.test', [{ role_id: readOnly }]);
    api.mail.isFailing = false;

    expect(response.statusCode).toBe(201);
    expect(response.json()).toMatchObject({ is_email_sent: false, member: { status: 'invited' } });
  });

  it('changes roles and refuses to leave the tenant without an owner', async () => {
    const members = (await api.call('GET', '/v1/members?q=olivia', asOwner)).json();
    const self = members[0].id;

    const demote = await api.call('PUT', `/v1/members/${self}/roles`, {
      ...asOwner,
      body: { roles: [{ role_id: readOnly }] },
    });
    const removeSelf = await api.call('DELETE', `/v1/members/${self}`, asOwner);

    expect(demote.json()).toMatchObject({ code: 'last_owner' });
    expect(removeSelf.json()).toMatchObject({ code: 'last_owner' });
  });

  it('ends a removed member’s access on their next request', async () => {
    const techToken = await api.issuer.signFor(tech);
    expect((await api.call('GET', '/v1/tenant', { token: techToken })).statusCode).toBe(200);
    const members = (await api.call('GET', '/v1/members?q=tech', asOwner)).json();

    const removed = await api.call('DELETE', `/v1/members/${members[0].id}`, asOwner);

    expect(removed.statusCode).toBe(204);
    const withHeader = await api.call('GET', '/v1/tenant', { token: techToken, tenantId: acme });
    const withoutHeader = await api.call('GET', '/v1/tenant', { token: techToken });
    expect(withHeader.json()).toMatchObject({ status: 404, code: 'tenant_not_found' });
    expect(withoutHeader.json()).toMatchObject({ status: 403, code: 'no_tenant' });
    const audit = (
      await api.call('GET', '/v1/audit-log?action=team.member_removed', asOwner)
    ).json();
    expect(audit.items[0]).toMatchObject({ actor_label: expect.stringContaining('Olivia') });
  });
});
