import { TestData, TestDatabase, TestPerson } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';
import { TestTariffBodies } from '../../testing/test-tariff-bodies';

/** Tariffs end to end: create, validate, rename, new price versions, permissions. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Tariffs', () => {
  const api = new TestApi();
  let acme: string;
  let olivia: TestPerson;
  let ownerToken: string;
  let tariffId: string;

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    olivia = await api.data.person('olivia@acme.test', 'Olivia Owner');
    await api.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    ownerToken = await api.issuer.signFor(olivia);
  });

  afterAll(async () => api.stop());

  const asOwner = () => ({ token: ownerToken });

  it('creates a tariff and shows its prices exactly as sent', async () => {
    const created = await api.call('POST', '/v1/tariffs', {
      ...asOwner(),
      body: TestTariffBodies.tariff('Standard'),
    });

    expect(created.statusCode).toBe(201);
    tariffId = created.json().id;
    expect(created.json()).toMatchObject({
      name: 'Standard',
      currency: 'GBP',
      status: 'active',
      site_count: 0,
      version: 1,
      current_version: {
        number: 1,
        tax_rate: '20.00',
        is_tax_included: true,
        idle_fee_cap: 1000,
        bands: [
          { name: 'Off-peak', energy_price_per_kwh: '0.3000', idle_fee_per_minute: '0.1000' },
          { name: 'Peak', start: '17:00', end: '24:00', energy_price_per_kwh: '0.4000' },
        ],
      },
    });

    const list = await api.call('GET', '/v1/tariffs', asOwner());
    expect(list.json()).toMatchObject({ items: [{ id: tariffId }], next_cursor: null });
  });

  it('refuses bands that leave a gap, limits that contradict, and bad prices', async () => {
    const gap = await api.call('POST', '/v1/tariffs', {
      ...asOwner(),
      body: TestTariffBodies.tariff('Gappy', {
        bands: [TestTariffBodies.band('Day', '08:00', '20:00', '0.30')],
      }),
    });
    expect(gap.statusCode).toBe(422);
    expect(gap.json()).toMatchObject({ code: 'tariff_invalid' });
    expect(gap.json().detail).toContain('has no band');

    const limits = await api.call('POST', '/v1/tariffs', {
      ...asOwner(),
      body: TestTariffBodies.tariff('Limits', { minimum_price: 500, maximum_price: 100 }),
    });
    expect(limits.statusCode).toBe(422);
    expect(limits.json().detail).toContain('minimum price is above the maximum');

    const price = await api.call('POST', '/v1/tariffs', {
      ...asOwner(),
      body: TestTariffBodies.tariff('Bad', {
        bands: [TestTariffBodies.band('All', '00:00', '24:00', '0.12345')],
      }),
    });
    expect(price.statusCode).toBe(400);
    expect(price.json()).toMatchObject({ code: 'validation_failed' });
  });

  it('renames a tariff with the version the caller saw, and keeps names unique', async () => {
    await api.call('POST', '/v1/tariffs', {
      ...asOwner(),
      body: TestTariffBodies.tariff('Fleet'),
    });

    const taken = await api.call('PATCH', `/v1/tariffs/${tariffId}`, {
      ...asOwner(),
      version: 1,
      body: { name: 'fleet' },
    });
    expect(taken.statusCode).toBe(409);
    expect(taken.json()).toMatchObject({ code: 'tariff_name_taken' });

    const renamed = await api.call('PATCH', `/v1/tariffs/${tariffId}`, {
      ...asOwner(),
      version: 1,
      body: { name: 'Standard 2026' },
    });
    expect(renamed.json()).toMatchObject({ name: 'Standard 2026', version: 2 });

    const stale = await api.call('PATCH', `/v1/tariffs/${tariffId}`, {
      ...asOwner(),
      version: 1,
      body: { name: 'Older' },
    });
    expect(stale.json()).toMatchObject({ code: 'version_conflict' });
  });

  it('adds a price version and keeps the old one in the history', async () => {
    const added = await api.call('POST', `/v1/tariffs/${tariffId}/versions`, {
      ...asOwner(),
      version: 2,
      body: TestTariffBodies.prices({ start_fee: 50, note: 'Peak up from April' }),
    });

    expect(added.statusCode).toBe(201);
    expect(added.json()).toMatchObject({
      version: 3,
      current_version: { number: 2, start_fee: 50, note: 'Peak up from April' },
    });

    const versions = await api.call('GET', `/v1/tariffs/${tariffId}/versions`, asOwner());
    expect(versions.json().map((version: { number: number }) => version.number)).toEqual([2, 1]);

    const audit = await api.call('GET', '/v1/audit-log?target_type=tariff', asOwner());
    expect(audit.json().items.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining(['tariffs.created', 'tariffs.renamed', 'tariffs.prices_changed']),
    );
  });

  it('lets a technician read tariffs but not change them', async () => {
    const tess = await api.data.person('tess@acme.test');
    await api.data.member(acme, tess, TestData.ROLE_IDS.technician);
    const token = await api.issuer.signFor(tess);

    expect((await api.call('GET', `/v1/tariffs/${tariffId}`, { token })).statusCode).toBe(200);
    const created = await api.call('POST', '/v1/tariffs', {
      token,
      body: TestTariffBodies.tariff('Mine'),
    });
    expect(created.statusCode).toBe(403);
  });

  it('refuses a tariff change to someone whose tariffs:write covers only some sites', async () => {
    const site = await api.data.site(acme, 'Depot North');
    const role = await api.data.customRole(acme, 'Site pricing', ['tariffs:read', 'tariffs:write']);
    const sam = await api.data.person('sam@acme.test');
    await api.data.member(acme, sam, role, site);

    const created = await api.call('POST', '/v1/tariffs', {
      token: await api.issuer.signFor(sam),
      body: TestTariffBodies.tariff('Local'),
    });
    expect(created.statusCode).toBe(403);
    expect(created.json()).toMatchObject({ code: 'permission_denied' });
  });
});
