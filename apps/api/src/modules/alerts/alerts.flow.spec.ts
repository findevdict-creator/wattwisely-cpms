import { TestData, TestDatabase, TestPerson } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Story NTF-04: alerts at one's own sites, acknowledged with a note; NTF-03: their routing. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Alerts', () => {
  const api = new TestApi();
  let acme: string;
  let owner: string;
  let technician: string;
  let readOnly: string;
  let riverAlert: string;
  let depotAlert: string;
  let technicianMembership: string;
  let riverside: string;

  const tokenFor = async (email: string, roleId: string, siteId: string | null = null) => {
    const person: TestPerson = await api.data.person(email, email.split('@')[0]);
    const membershipId = await api.data.member(acme, person, roleId, siteId);
    return { token: await api.issuer.signFor(person), membershipId };
  };

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    riverside = await api.data.site(acme, 'Riverside');
    const depot = await api.data.site(acme, 'Depot North');
    const riverCharger = await api.data.charger(acme, riverside, 'CP-RIVER-1');
    const depotCharger = await api.data.charger(acme, depot, 'CP-DEPOT-1');
    owner = (await tokenFor('olivia@acme.test', TestData.ROLE_IDS.owner)).token;
    const tech = await tokenFor('tom@acme.test', TestData.ROLE_IDS.technician, riverside);
    technician = tech.token;
    technicianMembership = tech.membershipId;
    readOnly = (await tokenFor('rita@acme.test', TestData.ROLE_IDS.readOnly)).token;
    riverAlert = await api.notifications.alert(
      { tenantId: acme, siteId: riverside, chargerId: riverCharger },
      { title: 'CP-RIVER-1 is offline' },
    );
    depotAlert = await api.notifications.alert(
      { tenantId: acme, siteId: depot, chargerId: depotCharger },
      { title: 'CP-DEPOT-1 is offline' },
    );
  });

  afterAll(async () => api.stop());

  it('lists open alerts at the sites the caller may see, with the badge counts', async () => {
    const all = await api.call('GET', '/v1/alerts?status=open', { token: owner });
    const tom = await api.call('GET', '/v1/alerts?status=open', { token: technician });
    const badge = await api.call('GET', '/v1/alerts/summary', { token: technician });

    expect(
      all
        .json()
        .items.map((alert: { title: string }) => alert.title)
        .sort(),
    ).toEqual(['CP-DEPOT-1 is offline', 'CP-RIVER-1 is offline']);
    expect(tom.json().items).toHaveLength(1);
    expect(tom.json().items[0]).toMatchObject({
      id: riverAlert,
      type: 'charger_offline',
      site_name: 'Riverside',
      charger_identity: 'CP-RIVER-1',
      version: 1,
    });
    expect(badge.json()).toEqual({ open: 1, acknowledged: 0 });
    expect(
      (await api.call('GET', `/v1/alerts/${depotAlert}`, { token: technician })).statusCode,
    ).toBe(404);
  });

  it('acknowledges an open alert with a note, once', async () => {
    const missingVersion = await api.call('POST', `/v1/alerts/${riverAlert}/acknowledge`, {
      token: technician,
      body: { note: 'On my way' },
    });
    const acknowledged = await api.call('POST', `/v1/alerts/${riverAlert}/acknowledge`, {
      token: technician,
      body: { note: 'On my way' },
      version: 1,
    });
    const again = await api.call('POST', `/v1/alerts/${riverAlert}/acknowledge`, {
      token: technician,
      body: {},
      version: 2,
    });

    expect(missingVersion.statusCode).toBe(428);
    expect(acknowledged.statusCode).toBe(200);
    expect(acknowledged.json()).toMatchObject({
      status: 'acknowledged',
      acknowledged_by: 'tom',
      acknowledge_note: 'On my way',
      version: 2,
    });
    expect(again.json().code).toBe('alert_not_open');
    const tab = await api.call('GET', '/v1/alerts?status=acknowledged', { token: owner });
    expect(tab.json().items.map((alert: { id: string }) => alert.id)).toEqual([riverAlert]);
  });

  it('refuses to acknowledge without alerts:acknowledge', async () => {
    const response = await api.call('POST', `/v1/alerts/${depotAlert}/acknowledge`, {
      token: readOnly,
      body: {},
      version: 1,
    });

    expect(response.statusCode).toBe(403);
  });

  it('shows the default routing, then saves rules by role and by person', async () => {
    const before = await api.call('GET', '/v1/alert-rules', { token: owner });
    expect(before.json().rules).toEqual([]);
    expect(before.json().default_rules[0]).toEqual({
      role_name: 'Owner',
      is_email: true,
      is_in_portal: true,
    });

    const saved = await api.call('PUT', '/v1/alert-rules', {
      token: owner,
      body: {
        rules: [
          {
            alert_type: 'connector_faulted',
            role_id: TestData.ROLE_IDS.operations,
            is_email: true,
            is_in_portal: true,
          },
          {
            alert_type: 'connector_faulted',
            site_id: riverside,
            membership_id: technicianMembership,
            is_email: true,
            is_in_portal: false,
          },
        ],
      },
    });

    expect(saved.statusCode).toBe(200);
    expect(saved.json().rules).toEqual([
      expect.objectContaining({ role_name: 'Operations', site_id: null, member_name: null }),
      expect.objectContaining({ member_name: 'tom', site_name: 'Riverside', is_in_portal: false }),
    ]);
  });

  it('refuses rules that name no recipient, two recipients, no channel or unknown rows', async () => {
    const rule = { alert_type: 'charger_offline', is_email: true, is_in_portal: true };
    const bodies = [
      { rules: [rule] },
      {
        rules: [{ ...rule, role_id: TestData.ROLE_IDS.owner, membership_id: technicianMembership }],
      },
      {
        rules: [
          { ...rule, role_id: TestData.ROLE_IDS.owner, is_email: false, is_in_portal: false },
        ],
      },
      {
        rules: [
          {
            ...rule,
            role_id: TestData.ROLE_IDS.owner,
            site_id: '00000000-0000-7000-8000-00000000abcd',
          },
        ],
      },
    ];
    for (const body of bodies) {
      const response = await api.call('PUT', '/v1/alert-rules', { token: owner, body });
      expect(response.statusCode).toBe(400);
    }
    const technicianTry = await api.call('PUT', '/v1/alert-rules', {
      token: technician,
      body: { rules: [] },
    });
    expect(technicianTry.statusCode).toBe(403);
  });
});
