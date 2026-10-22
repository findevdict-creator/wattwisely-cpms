import { TestData, TestDatabase, TestPerson } from '@wattwisely/db/testing';
import { TestApi } from '../../../testing/test-api';

/** Stories AST-02 and AST-03 end to end: register chargers, manage their connectors, within one's scope. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Chargers and connectors', () => {
  const api = new TestApi();
  let acme: string;
  let volt: string;
  let riverside: string;
  let depot: string;
  let olivia: TestPerson;
  let ownerToken: string;

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    volt = await api.data.tenant('volt-hotels');
    riverside = await api.data.site(acme, 'Riverside');
    depot = await api.data.site(acme, 'Depot North');
    olivia = await api.data.person('olivia@acme.test', 'Olivia Owner');
    await api.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    ownerToken = await api.issuer.signFor(olivia);
  });

  afterAll(async () => api.stop());

  const asOwner = () => ({ token: ownerToken });
  const register = (body: object, token = ownerToken) =>
    api.call('POST', '/v1/chargers', { token, body });

  it('registers a charger with a generated identity and a password shown once', async () => {
    const response = await register({
      site_id: riverside,
      identity_mode: 'generate',
      vendor: 'Alfen',
      model: 'Eve Single Pro-line',
    });

    expect(response.statusCode).toBe(201);
    const { charger, setup } = response.json();
    expect(charger).toMatchObject({
      site_id: riverside,
      site_name: 'Riverside',
      vendor: 'Alfen',
      auth_mode: 'password',
      allow_plain_ws: false,
      visibility: 'private',
      status: 'waiting',
      ocpp_version: null,
      connectors: [],
      version: 1,
    });
    expect(charger.ocpp_identity).toMatch(/^WW-[0-9A-HJKMNP-TV-Z]{10}$/);
    expect(setup).toEqual({
      ocpp_url: `wss://ocpp.test/ocpp/${charger.ocpp_identity}`,
      ocpp_plain_url: null,
      identity: charger.ocpp_identity,
      password: expect.stringMatching(/^[A-Za-z0-9]{24}$/),
    });

    const fetched = await api.call('GET', `/v1/chargers/${charger.id}`, asOwner());
    expect(fetched.json()).not.toHaveProperty('password');
    expect(fetched.json()).not.toHaveProperty('password_hash');
  });

  it('accepts the charger’s own identity once, platform-wide, whatever the case', async () => {
    const first = await register({
      site_id: depot,
      identity_mode: 'existing',
      identity: 'SN-AB129934',
      auth_mode: 'none',
      allow_plain_ws: true,
    });
    expect(first.statusCode).toBe(201);
    expect(first.json().setup).toEqual({
      ocpp_url: 'wss://ocpp.test/ocpp/SN-AB129934',
      ocpp_plain_url: 'ws://ocpp-plain.test/ocpp/SN-AB129934',
      identity: 'SN-AB129934',
      password: null,
    });

    const vera = await api.data.person('vera@volt.test');
    await api.data.member(volt, vera, TestData.ROLE_IDS.owner);
    const voltSite = await api.data.site(volt, 'Hotel Garage');
    const clash = await register(
      { site_id: voltSite, identity_mode: 'existing', identity: 'sn-ab129934' },
      await api.issuer.signFor(vera),
    );
    expect(clash.statusCode).toBe(409);
    expect(clash.json()).toMatchObject({ code: 'identity_taken' });

    const missing = await register({ site_id: depot, identity_mode: 'existing' });
    expect(missing.statusCode).toBe(422);
    expect(missing.json()).toMatchObject({ code: 'identity_required' });

    const unknownSite = await register({
      site_id: '0190a8e2-0000-7000-8000-00000000cccc',
      identity_mode: 'generate',
    });
    expect(unknownSite.statusCode).toBe(422);
    expect(unknownSite.json()).toMatchObject({ code: 'site_not_found' });
  });

  it('lists chargers by identity with filters and search', async () => {
    const all = await api.call('GET', '/v1/chargers', asOwner());
    expect(all.json().items.map((c: { ocpp_identity: string }) => c.ocpp_identity)).toEqual([
      'SN-AB129934',
      expect.stringMatching(/^WW-/),
    ]);

    const atDepot = await api.call('GET', `/v1/chargers?site_id=${depot}`, asOwner());
    expect(atDepot.json().items).toHaveLength(1);

    const byVendor = await api.call('GET', '/v1/chargers?vendor=alfen&status=waiting', asOwner());
    expect(byVendor.json().items).toEqual([expect.objectContaining({ vendor: 'Alfen' })]);

    const bySite = await api.call('GET', '/v1/chargers?q=depot', asOwner());
    expect(bySite.json().items).toEqual([expect.objectContaining({ site_name: 'Depot North' })]);

    const none = await api.call('GET', '/v1/chargers?status=charging,offline', asOwner());
    expect(none.json().items).toEqual([]);
  });

  it('lets a technician work only on their own site’s chargers', async () => {
    const tess = await api.data.person('tess@acme.test');
    await api.data.member(acme, tess, TestData.ROLE_IDS.technician, depot);
    const token = await api.issuer.signFor(tess);
    const chargers = (await api.call('GET', '/v1/chargers', { token })).json().items;
    expect(chargers).toEqual([expect.objectContaining({ site_id: depot })]);

    const elsewhere = (await api.call('GET', '/v1/chargers', asOwner()))
      .json()
      .items.find((c: { site_id: string }) => c.site_id === riverside);
    expect((await api.call('GET', `/v1/chargers/${elsewhere.id}`, { token })).statusCode).toBe(404);

    const toRiverside = await api.call('PATCH', `/v1/chargers/${chargers[0].id}`, {
      token,
      version: chargers[0].version,
      body: { site_id: riverside },
    });
    expect(toRiverside.statusCode).toBe(403);
    expect(toRiverside.json()).toMatchObject({ code: 'permission_denied' });

    const atRiverside = await register({ site_id: riverside, identity_mode: 'generate' }, token);
    expect(atRiverside.statusCode).toBe(403);
  });

  it('changes passwords and fingerprints, moves and removes chargers, with audit entries', async () => {
    const charger = (await api.call('GET', '/v1/chargers?q=SN-AB', asOwner())).json().items[0];
    const id = charger.id;

    const withPassword = await api.call('POST', `/v1/chargers/${id}/password`, {
      ...asOwner(),
      version: 1,
    });
    expect(withPassword.statusCode).toBe(201);
    expect(withPassword.json().charger).toMatchObject({ auth_mode: 'password', version: 2 });
    expect(withPassword.json().setup.password).toMatch(/^[A-Za-z0-9]{24}$/);

    const noPassword = await api.call('DELETE', `/v1/chargers/${id}/password`, {
      ...asOwner(),
      version: 2,
    });
    expect(noPassword.json().charger).toMatchObject({ auth_mode: 'none', version: 3 });
    expect(noPassword.json().setup.password).toBeNull();

    const reset = await api.call('POST', `/v1/chargers/${id}/fingerprint/reset`, {
      ...asOwner(),
      version: 3,
    });
    expect(reset.json()).toMatchObject({ boot_fingerprint: null, version: 4 });

    const moved = await api.call('PATCH', `/v1/chargers/${id}`, {
      ...asOwner(),
      version: 4,
      body: { site_id: riverside, visibility_override: 'public', model: null },
    });
    expect(moved.json()).toMatchObject({
      site_name: 'Riverside',
      visibility: 'public',
      version: 5,
    });

    const stale = await api.call('DELETE', `/v1/chargers/${id}`, { ...asOwner(), version: 4 });
    expect(stale.statusCode).toBe(409);
    const removed = await api.call('DELETE', `/v1/chargers/${id}`, { ...asOwner(), version: 5 });
    expect(removed.statusCode).toBe(204);
    expect((await api.call('GET', `/v1/chargers/${id}`, asOwner())).statusCode).toBe(404);

    const reused = await register({
      site_id: depot,
      identity_mode: 'existing',
      identity: 'SN-AB129934',
    });
    expect(reused.statusCode).toBe(201);

    const audit = await api.call('GET', '/v1/audit-log?target_type=charger', asOwner());
    expect(audit.json().items.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining([
        'chargers.registered',
        'chargers.password_changed',
        'chargers.password_removed',
        'chargers.fingerprint_reset',
        'chargers.updated',
        'chargers.removed',
      ]),
    );
  });
});
