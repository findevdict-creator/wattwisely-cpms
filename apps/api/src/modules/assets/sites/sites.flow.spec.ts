import { TestApi } from '../../../testing/test-api';
import { TestData, TestPerson } from '../../../testing/test-data';
import { TestDatabase } from '../../../testing/test-database';

/** Story AST-01 end to end: create, list, search, change and remove sites, within one's scope. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Sites', () => {
  const api = new TestApi();
  const riverside = {
    name: 'Riverside Car Park',
    address: { line1: '12 Thames Path', city: 'London', postal_code: 'SE1 2AA', country: 'GB' },
    latitude: 51.5055,
    longitude: -0.0754,
    time_zone: 'Europe/London',
    opening_hours: { mon: [{ opens: '07:00', closes: '22:00' }] },
    power_limit_kw: 600,
  };
  let acme: string;
  let volt: string;
  let olivia: TestPerson;
  let ownerToken: string;

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    volt = await api.data.tenant('volt-hotels');
    olivia = await api.data.person('olivia@acme.test', 'Olivia Owner');
    await api.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    ownerToken = await api.issuer.signFor(olivia);
  });

  afterAll(async () => api.stop());

  const asOwner = () => ({ token: ownerToken });

  it('creates a site and lists it with an empty fleet', async () => {
    const created = await api.call('POST', '/v1/sites', { ...asOwner(), body: riverside });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      name: 'Riverside Car Park',
      address: riverside.address,
      visibility: 'private',
      parking_notes: '',
      status: 'ok',
      charger_count: 0,
      connector_count: 0,
      version: 1,
    });

    const list = await api.call('GET', '/v1/sites?q=thames', asOwner());
    expect(list.json()).toMatchObject({ items: [{ id: created.json().id }], next_cursor: null });
  });

  it('refuses a second site with the same name, and bad input', async () => {
    const again = await api.call('POST', '/v1/sites', {
      ...asOwner(),
      body: { ...riverside, name: 'riverside car park' },
    });
    expect(again.statusCode).toBe(409);
    expect(again.json()).toMatchObject({ code: 'site_name_taken' });

    const badZone = await api.call('POST', '/v1/sites', {
      ...asOwner(),
      body: { ...riverside, name: 'Depot', time_zone: 'Mars/Olympus' },
    });
    expect(badZone.statusCode).toBe(400);
    expect(badZone.json()).toMatchObject({ code: 'validation_failed' });
  });

  it('changes a site only with the version the caller saw', async () => {
    const id = (await api.call('GET', '/v1/sites', asOwner())).json().items[0].id;

    const noVersion = await api.call('PATCH', `/v1/sites/${id}`, {
      ...asOwner(),
      body: { parking_notes: 'Level -1' },
    });
    expect(noVersion.statusCode).toBe(428);

    const changed = await api.call('PATCH', `/v1/sites/${id}`, {
      ...asOwner(),
      version: 1,
      body: { parking_notes: 'Level -1', visibility: 'public', opening_hours: null },
    });
    expect(changed.statusCode).toBe(200);
    expect(changed.json()).toMatchObject({
      parking_notes: 'Level -1',
      visibility: 'public',
      opening_hours: null,
      version: 2,
    });

    const stale = await api.call('PATCH', `/v1/sites/${id}`, {
      ...asOwner(),
      version: 1,
      body: { parking_notes: 'Level -2' },
    });
    expect(stale.statusCode).toBe(409);
    expect(stale.json()).toMatchObject({ code: 'version_conflict' });
  });

  it('pages sites by name, in a stable order', async () => {
    for (const name of ['Depot North', 'Airport Long Stay', 'Mall West']) {
      await api.call('POST', '/v1/sites', { ...asOwner(), body: { ...riverside, name } });
    }

    const first = await api.call('GET', '/v1/sites?limit=2', asOwner());
    const names = (page: { items: { name: string }[] }) => page.items.map((site) => site.name);
    expect(names(first.json())).toEqual(['Airport Long Stay', 'Depot North']);
    expect(first.json().next_cursor).toEqual(expect.any(String));

    const second = await api.call(
      'GET',
      `/v1/sites?limit=2&cursor=${encodeURIComponent(first.json().next_cursor)}`,
      asOwner(),
    );
    expect(names(second.json())).toEqual(['Mall West', 'Riverside Car Park']);
    expect(second.json().next_cursor).toBeNull();
  });

  it('shows a site-scoped technician only their site, and keeps other tenants out', async () => {
    const depot = (await api.call('GET', '/v1/sites?q=depot', asOwner())).json().items[0];
    const mall = (await api.call('GET', '/v1/sites?q=mall', asOwner())).json().items[0];
    const tess = await api.data.person('tess@acme.test');
    await api.data.member(acme, tess, TestData.ROLE_IDS.technician, depot.id);
    const token = await api.issuer.signFor(tess);

    const list = await api.call('GET', '/v1/sites', { token });
    expect(list.json().items.map((site: { id: string }) => site.id)).toEqual([depot.id]);
    expect((await api.call('GET', `/v1/sites/${mall.id}`, { token })).statusCode).toBe(404);
    expect((await api.call('GET', `/v1/sites/${depot.id}`, { token })).statusCode).toBe(200);

    const vera = await api.data.person('vera@volt.test');
    await api.data.member(volt, vera, TestData.ROLE_IDS.owner);
    const other = await api.call('GET', `/v1/sites/${depot.id}`, {
      token: await api.issuer.signFor(vera),
    });
    expect(other.statusCode).toBe(404);
  });

  it('refuses site creation to someone whose sites:write covers only some sites', async () => {
    const depot = (await api.call('GET', '/v1/sites?q=depot', asOwner())).json().items[0];
    const siteAdmin = await api.data.customRole(acme, 'Site admin', ['sites:read', 'sites:write']);
    const sam = await api.data.person('sam@acme.test');
    await api.data.member(acme, sam, siteAdmin, depot.id);
    const token = await api.issuer.signFor(sam);

    const created = await api.call('POST', '/v1/sites', {
      token,
      body: { ...riverside, name: 'Somewhere' },
    });
    expect(created.statusCode).toBe(403);
    expect(created.json()).toMatchObject({ code: 'permission_denied' });

    const edited = await api.call('PATCH', `/v1/sites/${depot.id}`, {
      token,
      version: 1,
      body: { parking_notes: 'Gate B' },
    });
    expect(edited.statusCode).toBe(200);
  });

  it('removes an empty site, but not one with chargers, and writes the audit log', async () => {
    const mall = (await api.call('GET', '/v1/sites?q=mall', asOwner())).json().items[0];
    const depot = (await api.call('GET', '/v1/sites?q=depot', asOwner())).json().items[0];
    await api.data.charger(acme, depot.id, 'CP-DEPOT-1');

    const busy = await api.call('DELETE', `/v1/sites/${depot.id}`, { ...asOwner(), version: 2 });
    expect(busy.statusCode).toBe(409);
    expect(busy.json()).toMatchObject({ code: 'site_has_chargers' });

    const removed = await api.call('DELETE', `/v1/sites/${mall.id}`, { ...asOwner(), version: 1 });
    expect(removed.statusCode).toBe(204);
    expect((await api.call('GET', `/v1/sites/${mall.id}`, asOwner())).statusCode).toBe(404);

    const audit = await api.call('GET', '/v1/audit-log?target_type=site', asOwner());
    expect(audit.json().items.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining(['sites.created', 'sites.updated', 'sites.deleted']),
    );
  });
});
