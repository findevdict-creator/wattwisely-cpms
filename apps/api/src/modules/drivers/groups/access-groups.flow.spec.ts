import { TestData, TestDatabase, TestDrivers, TestPerson } from '@wattwisely/db/testing';
import { TestApi } from '../../../testing/test-api';

/** Story AST-04: access groups open private sites to chosen drivers. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Access groups', () => {
  const api = new TestApi();
  let acme: string;
  let owner: string;
  let depot: string;
  let dana: string;
  let group: { id: string; version: number };

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    const person: TestPerson = await api.data.person('olivia@acme.test', 'olivia');
    await api.data.member(acme, person, TestData.ROLE_IDS.owner);
    owner = await api.issuer.signFor(person);
    depot = await api.data.site(acme, 'Depot North');
    dana = await new TestDrivers(api.data).driver(acme, 'Dana Driver');
  });

  afterAll(async () => api.stop());

  it('creates a group with its sites and drivers', async () => {
    const created = await api.call('POST', '/v1/access-groups', {
      token: owner,
      body: { name: 'Depot staff', site_ids: [depot], driver_ids: [dana, dana] },
    });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      name: 'Depot staff',
      sites: [{ id: depot, name: 'Depot North' }],
      members: [{ id: dana, name: 'Dana Driver' }],
      version: 1,
    });
    group = { id: created.json().id, version: 1 };
    const driver = await api.call('GET', `/v1/drivers/${dana}`, { token: owner });
    expect(driver.json().groups).toEqual([{ id: group.id, name: 'Depot staff' }]);
    const inGroup = await api.call('GET', `/v1/drivers?group_id=${group.id}`, { token: owner });
    expect(inGroup.json().items).toHaveLength(1);
  });

  it('refuses a site or driver that does not exist, and a name already used', async () => {
    const otherTenant = await api.data.tenant('volt-hotels');
    const foreignSite = await api.data.site(otherTenant, 'Volt Lobby');
    const badSite = await api.call('PATCH', `/v1/access-groups/${group.id}`, {
      token: owner,
      body: { site_ids: [foreignSite] },
      version: 1,
    });
    const badDriver = await api.call('PATCH', `/v1/access-groups/${group.id}`, {
      token: owner,
      body: { driver_ids: ['00000000-0000-7000-8000-000000000999'] },
      version: 1,
    });
    const sameName = await api.call('POST', '/v1/access-groups', {
      token: owner,
      body: { name: 'depot STAFF' },
    });

    expect(badSite.statusCode).toBe(422);
    expect(badSite.json().code).toBe('site_not_found');
    expect(badDriver.json().code).toBe('driver_not_found');
    expect(sameName.json().code).toBe('access_group_name_taken');
  });

  it('replaces the lists as a whole, and the driver side sees the same groups', async () => {
    const emptied = await api.call('PATCH', `/v1/access-groups/${group.id}`, {
      token: owner,
      body: { description: 'Badge holders', driver_ids: [] },
      version: 1,
    });
    expect(emptied.json()).toMatchObject({ description: 'Badge holders', members: [], version: 2 });

    const joined = await api.call('PATCH', `/v1/drivers/${dana}`, {
      token: owner,
      body: { group_ids: [group.id] },
      version: 1,
    });
    expect(joined.json().groups).toEqual([{ id: group.id, name: 'Depot staff' }]);
    const list = await api.call('GET', '/v1/access-groups', { token: owner });
    expect(list.json().items[0].members).toEqual([{ id: dana, name: 'Dana Driver' }]);
  });

  it('deletes a group with its sites and members, at the version seen', async () => {
    const stale = await api.call('DELETE', `/v1/access-groups/${group.id}`, {
      token: owner,
      version: 1,
    });
    const removed = await api.call('DELETE', `/v1/access-groups/${group.id}`, {
      token: owner,
      version: 2,
    });

    expect(stale.statusCode).toBe(409);
    expect(removed.statusCode).toBe(204);
    expect(
      (await api.call('GET', `/v1/access-groups/${group.id}`, { token: owner })).statusCode,
    ).toBe(404);
    const driver = await api.call('GET', `/v1/drivers/${dana}`, { token: owner });
    expect(driver.json().groups).toEqual([]);
  });
});
