import { ManagedFixture } from './managed.fixture';

/** Stories MGT-01 and MGT-05: what staff cannot do with an agreement. */
(ManagedFixture.isConfigured() ? describe : describe.skip)('Managed service refusals', () => {
  const fixture = new ManagedFixture();
  const { api } = fixture;

  beforeAll(() => fixture.start());
  afterAll(() => fixture.stop());

  it('refuses notice while the tenant has no Owner of its own, and withdraws unaccepted offers', async () => {
    const volt = await api.data.tenant('volt-hotels');
    const service = await api.managed.service(volt, fixture.adminStaffId, 'active');
    await api.managed.operator(volt, service, await api.data.person('ops@wattwisely.test', 'Ops'));
    const voltUrl = `/v1/admin/tenants/${volt}/managed-service`;
    const current = (await api.call('GET', voltUrl, fixture.asAdmin())).json();
    const noticed = await api.call(
      'POST',
      `${voltUrl}/notice`,
      fixture.asAdmin({}, current.version),
    );
    const solo = await api.data.tenant('solo-co');
    const soloUrl = `/v1/admin/tenants/${solo}/managed-service`;
    await api.call('POST', soloUrl, fixture.asAdmin({ account_manager_id: fixture.adminStaffId }));
    const withdrawn = await api.call('POST', `${soloUrl}/withdraw`, fixture.asAdmin(undefined, 1));
    const none = await api.call(
      'GET',
      `/v1/admin/tenants/${await api.data.tenant('plain-co')}/managed-service`,
      fixture.asAdmin(),
    );

    expect(noticed.statusCode).toBe(409);
    expect(noticed.json()).toMatchObject({ code: 'own_owner_required' });
    expect(withdrawn.statusCode).toBe(200);
    expect(withdrawn.json()).toMatchObject({ status: 'withdrawn' });
    expect(none.statusCode).toBe(404);
  });
});
