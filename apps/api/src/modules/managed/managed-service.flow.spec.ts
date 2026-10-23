import { TestData } from '@wattwisely/db/testing';
import { ManagedFixture } from './managed.fixture';

/** Stories MGT-01, MGT-02 and MGT-05: an agreement is offered, accepted, worked under and ended. */
(ManagedFixture.isConfigured() ? describe : describe.skip)('Managed service', () => {
  const fixture = new ManagedFixture();
  const { api } = fixture;
  const url = () => `/v1/admin/tenants/${fixture.acme}/managed-service`;

  beforeAll(() => fixture.start());
  afterAll(() => fixture.stop());

  it('lets staff offer an agreement that waits for the Owner, who is told by e-mail', async () => {
    const offered = await api.call(
      'POST',
      url(),
      fixture.asAdmin({
        account_manager_id: fixture.samStaffId,
        agreement_reference: 'MSA-1',
        notes: 'Pilot customer',
      }),
    );
    const asViewer = await api.call('POST', url(), {
      token: fixture.viewerToken,
      body: { account_manager_id: fixture.samStaffId },
    });
    const again = await api.call(
      'POST',
      url(),
      fixture.asAdmin({ account_manager_id: fixture.samStaffId }),
    );
    const mine = await api.call('GET', '/v1/managed-service', fixture.asOwner());
    const permissions = await api.call('GET', '/v1/me/permissions', fixture.asOwner());
    const tooEarly = await api.call(
      'PUT',
      `${url()}/operators/${fixture.samStaffId}`,
      fixture.asAdmin({}),
    );

    expect(offered.statusCode).toBe(201);
    expect(offered.json()).toMatchObject({
      status: 'pending_acceptance',
      account_manager: { staff_id: fixture.samStaffId, name: 'Sam Support' },
      agreement_reference: 'MSA-1',
      notes: 'Pilot customer',
      is_tariff_approval_required: true,
      operators: [],
    });
    expect(asViewer.statusCode).toBe(403);
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ code: 'managed_service_exists' });
    expect(mine.json()).toMatchObject({ status: 'pending_acceptance', notes: null });
    expect(permissions.json().managed_service).toMatchObject({
      status: 'pending_acceptance',
      is_operator: false,
      account_manager_name: 'Sam Support',
    });
    expect(tooEarly.statusCode).toBe(409);
    expect(tooEarly.json()).toMatchObject({ code: 'not_managed' });
    expect(fixture.mailsToOwner()).toEqual(['Wattwisely offers to manage your charging']);
  });

  it('starts once the Owner accepts, and then lets staff put Sam in as Managed operator', async () => {
    const refused = await api.call(
      'POST',
      '/v1/managed-service/accept',
      fixture.asOwner({ accept_terms: false }),
    );
    const accepted = await api.call(
      'POST',
      '/v1/managed-service/accept',
      fixture.asOwner({ accept_terms: true }),
    );
    const assigned = await api.call(
      'PUT',
      `${url()}/operators/${fixture.samStaffId}`,
      fixture.asAdmin({}),
    );
    const samsView = await api.call('GET', '/v1/me/permissions', fixture.asSam());
    const samsSites = await api.call('GET', '/v1/sites', fixture.asSam());
    const team = await api.call('GET', '/v1/members', fixture.asOwner());

    expect(refused.statusCode).toBe(400);
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json()).toMatchObject({ status: 'active', accepted_at: expect.any(String) });
    expect(assigned.statusCode).toBe(200);
    expect(assigned.json()).toMatchObject({
      staff_id: fixture.samStaffId,
      email: 'sam@wattwisely.test',
    });
    expect(samsView.json()).toMatchObject({
      roles: [{ key: 'managed-operator' }],
      managed_service: { status: 'active', is_operator: true, is_tariff_approval_required: true },
    });
    expect(samsView.json().permissions).toContainEqual({ key: 'chargers:command', site_ids: null });
    expect(samsView.json().permissions).not.toContainEqual(
      expect.objectContaining({ key: 'team:manage' }),
    );
    expect(samsSites.statusCode).toBe(200);
    expect(team.json()).toContainEqual(
      expect.objectContaining({ email: 'sam@wattwisely.test', is_managed_operator: true }),
    );
  });

  it('labels what Sam does as Wattwisely in the audit log, which the tenant can filter by', async () => {
    const created = await api.call(
      'POST',
      '/v1/sites',
      fixture.asSam({
        name: 'Harbour',
        address: { line1: '1 Quay', city: 'London', postal_code: 'E1 6AN', country: 'GB' },
        latitude: 51.5,
        longitude: -0.07,
        time_zone: 'Europe/London',
      }),
    );
    const log = await api.call('GET', '/v1/audit-log?actor_type=managed', fixture.asOwner());

    expect(created.statusCode).toBe(201);
    expect(log.json().items).toEqual([
      expect.objectContaining({
        actor_type: 'managed',
        actor_label: 'Sam Support <sam@wattwisely.test>',
        action: 'sites.created',
      }),
    ]);
  });

  it('keeps the Managed operator out of the tenant’s own hands', async () => {
    const team = (await api.call('GET', '/v1/members', fixture.asOwner())).json();
    const sam = team.find((member: { email: string }) => member.email === 'sam@wattwisely.test');
    const removed = await api.call('DELETE', `/v1/members/${sam.id}`, fixture.asOwner());
    const changed = await api.call(
      'PUT',
      `/v1/members/${sam.id}/roles`,
      fixture.asOwner({ roles: [{ role_id: TestData.ROLE_IDS.readOnly }] }),
    );
    const invited = await api.call(
      'POST',
      '/v1/members/invites',
      fixture.asOwner({
        email: 'new@acme.test',
        roles: [{ role_id: TestData.ROLE_IDS.managedOperator }],
      }),
    );

    expect(removed.statusCode).toBe(403);
    expect(removed.json()).toMatchObject({ code: 'managed_operator_protected' });
    expect(changed.statusCode).toBe(403);
    expect(invited.statusCode).toBe(403);
    expect(invited.json()).toMatchObject({ code: 'role_reserved' });
  });

  it('ends with 30 days’ notice from the Owner, and at once for staff who leave Wattwisely', async () => {
    const tooShort = await api.call(
      'POST',
      '/v1/managed-service/notice',
      fixture.asOwner({ ends_at: new Date().toISOString() }),
    );
    const noticed = await api.call(
      'POST',
      '/v1/managed-service/notice',
      fixture.asOwner({ reason: 'Hiring our own team' }),
    );
    const staff = (await api.call('GET', '/v1/admin/staff', fixture.asAdmin())).json();
    const samStaff = staff.find((member: { id: string }) => member.id === fixture.samStaffId);
    const left = await api.call(
      'DELETE',
      `/v1/admin/staff/${fixture.samStaffId}`,
      fixture.asAdmin(undefined, samStaff.version),
    );
    const samsSites = await api.call('GET', '/v1/sites', fixture.asSam());
    const after = (await api.call('GET', url(), fixture.asAdmin())).json();
    const report = await api.call('GET', '/v1/managed-service/report', fixture.asOwner());

    expect(tooShort.statusCode).toBe(422);
    expect(tooShort.json()).toMatchObject({ code: 'notice_too_short' });
    expect(noticed.statusCode).toBe(200);
    expect(noticed.json()).toMatchObject({ status: 'ending', ends_at: expect.any(String) });
    const daysLeft = (Date.parse(noticed.json().ends_at) - Date.now()) / 86_400_000;
    expect(daysLeft).toBeGreaterThan(29.9);
    expect(fixture.mailsToOwner().at(-1)).toMatch(/^Your managed service ends on /);
    expect(left.statusCode).toBe(200);
    expect(samsSites.statusCode).toBe(404);
    expect(after).toMatchObject({ status: 'ending', operators: [] });
    expect(report.statusCode).toBe(200);
    expect(report.json()).toMatchObject({
      is_complete: true,
      chargers: [],
      refunds: { count: 0, total: 0 },
      actions_by_wattwisely: 0,
    });
  });
});
