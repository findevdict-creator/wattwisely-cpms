import { TestData, TestDatabase } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';
import { TestTariffBodies } from '../../testing/test-tariff-bodies';

/** Assigning tariffs to sites, archiving them, and previewing what a session costs. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Tariffs on sites', () => {
  const api = new TestApi();
  let ownerToken: string;
  let tariff: { id: string; version: number };
  let siteId: string;

  beforeAll(async () => {
    await api.start();
    const acme = await api.data.tenant('acme-charging');
    const olivia = await api.data.person('olivia@acme.test', 'Olivia Owner');
    await api.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    ownerToken = await api.issuer.signFor(olivia);
    siteId = await api.data.site(acme, 'Riverside');
    const created = await api.call('POST', '/v1/tariffs', {
      token: ownerToken,
      body: TestTariffBodies.tariff('Standard'),
    });
    tariff = created.json();
  });

  afterAll(async () => api.stop());

  const asOwner = () => ({ token: ownerToken });

  it('previews the worked example: one hour across the peak boundary', async () => {
    const preview = await api.call('POST', '/v1/tariffs/preview', {
      ...asOwner(),
      body: {
        currency: 'GBP',
        time_zone: 'Europe/London',
        prices: TestTariffBodies.prices(),
        started_at: '2026-03-10T16:30:00Z',
        ended_at: '2026-03-10T17:30:00Z',
        energy_wh: 22000,
        idle_minutes: 25,
      },
    });

    expect(preview.statusCode).toBe(200);
    // Even flow: 11 kWh off-peak (3.30), 11 kWh peak (4.40), 10 billable idle minutes (1.00).
    expect(preview.json()).toMatchObject({
      gross_total: 870,
      tax_total: 145,
      net_total: 725,
      billable_idle_minutes: 10,
      flags: [],
    });
    expect(
      preview.json().lines.map((line: { band_name: string; gross: number }) => line.gross),
    ).toEqual([330, 440, 100]);
  });

  it('refuses a preview that ends before it starts', async () => {
    const preview = await api.call('POST', '/v1/tariffs/preview', {
      ...asOwner(),
      body: {
        currency: 'GBP',
        time_zone: 'Europe/London',
        prices: TestTariffBodies.prices(),
        started_at: '2026-03-10T17:30:00Z',
        ended_at: '2026-03-10T16:30:00Z',
        energy_wh: 1000,
        idle_minutes: 0,
      },
    });
    expect(preview.statusCode).toBe(422);
    expect(preview.json()).toMatchObject({ code: 'preview_invalid' });
  });

  it('assigns a tariff to a site, and refuses one that does not exist', async () => {
    const assigned = await api.call('PATCH', `/v1/sites/${siteId}`, {
      ...asOwner(),
      version: 1,
      body: { tariff_id: tariff.id },
    });
    expect(assigned.statusCode).toBe(200);
    expect(assigned.json()).toMatchObject({ tariff_id: tariff.id, version: 2 });

    const unknown = await api.call('PATCH', `/v1/sites/${siteId}`, {
      ...asOwner(),
      version: 2,
      body: { tariff_id: '00000000-0000-7000-8000-00000000abcd' },
    });
    expect(unknown.statusCode).toBe(422);
    expect(unknown.json()).toMatchObject({ code: 'tariff_not_found' });

    const shown = await api.call('GET', `/v1/tariffs/${tariff.id}`, asOwner());
    expect(shown.json()).toMatchObject({ site_count: 1 });
  });

  it('archives a tariff only once no site uses it', async () => {
    const inUse = await api.call('DELETE', `/v1/tariffs/${tariff.id}`, {
      ...asOwner(),
      version: tariff.version,
    });
    expect(inUse.statusCode).toBe(409);
    expect(inUse.json()).toMatchObject({ code: 'tariff_in_use' });

    await api.call('PATCH', `/v1/sites/${siteId}`, {
      ...asOwner(),
      version: 2,
      body: { tariff_id: null },
    });
    const archived = await api.call('DELETE', `/v1/tariffs/${tariff.id}`, {
      ...asOwner(),
      version: tariff.version,
    });
    expect(archived.statusCode).toBe(204);

    const active = await api.call('GET', '/v1/tariffs', asOwner());
    expect(active.json().items).toEqual([]);
    const old = await api.call('GET', '/v1/tariffs?status=archived', asOwner());
    expect(old.json().items).toMatchObject([{ id: tariff.id, status: 'archived' }]);

    const reassigned = await api.call('PATCH', `/v1/sites/${siteId}`, {
      ...asOwner(),
      version: 3,
      body: { tariff_id: tariff.id },
    });
    expect(reassigned.json()).toMatchObject({ code: 'tariff_not_found' });
  });
});
