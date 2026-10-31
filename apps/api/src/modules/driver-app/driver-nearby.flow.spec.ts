import { TestDatabase, TestDrivers } from '@wattwisely/db/testing';
import { DriverChargesFixture } from './driver-charges.fixture';

/**
 * Module 35: the sites near the phone. Every operator's public sites in the circle, and the
 * private sites the driver's access groups open; nothing farther, private to others, deleted
 * or of an operator that no longer trades.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('Sites near the driver', () => {
  const stage = new DriverChargesFixture();
  const { api } = stage;
  const near = (token: string, query = 'latitude=51.5&longitude=-0.07') =>
    api.call('GET', `/v1/driver/places/nearby?${query}`, { token });
  const placeSite = async (tenantId: string, name: string, latitude: number, isPublic: boolean) => {
    const id = await api.data.site(tenantId, name);
    await api.data.sql(
      `update sites set latitude = $2, visibility = $3::site_visibility where id = $1`,
      [id, latitude, isPublic ? 'public' : 'private'],
    );
    return id;
  };

  beforeAll(async () => {
    await stage.start();
    const voltHub = await api.data.tenant('volthub');
    await placeSite(voltHub, 'Mall West', 51.505, true);
    await placeSite(voltHub, 'Far Away', 52.5, true);
    const gone = await api.data.tenant('gone-charging', 'suspended');
    await placeSite(gone, 'Closed Down', 51.501, true);
    const depot = await placeSite(stage.acme, 'Depot North', 51.508, false);
    await placeSite(stage.acme, 'Office Garage', 51.503, false);
    await new TestDrivers(api.data).group(stage.acme, 'Depot staff', {
      siteIds: [depot],
      driverIds: [stage.danaDriverId],
    });
  });
  afterAll(() => stage.stop());

  it('lists public sites and the member’s private ones, nearest first', async () => {
    const answer = await near(stage.danaToken);
    expect(answer.statusCode).toBe(200);
    const items = answer.json().items;
    expect(items.map((item: { site_name: string }) => item.site_name)).toEqual([
      'Riverside',
      'Mall West',
      'Depot North',
    ]);
    expect(items[0]).toMatchObject({
      operator_name: 'acme charging',
      distance_m: 0,
      connector_count: 3,
      available_count: 3,
      is_private_site: false,
      is_member: true,
      currency: 'GBP',
      from_energy_price_per_kwh: expect.stringMatching(/^\d+\.\d{4}$/),
      plug: { charger_identity: DriverChargesFixture.CHARGER, ocpp_connector_id: 1 },
    });
    expect(items[1]).toMatchObject({ operator_name: 'volthub', is_member: false, plug: null });
    expect(items[1].distance_m).toBeGreaterThan(500);
    expect(items[1].distance_m).toBeLessThan(600);
    expect(items[2]).toMatchObject({ is_private_site: true, is_member: true });
  });

  it('shows a stranger only the public sites, and refuses a point off the map', async () => {
    const items = (await near(stage.guyToken)).json().items;
    expect(items.map((item: { site_name: string }) => item.site_name)).toEqual([
      'Riverside',
      'Mall West',
    ]);
    expect(items[0].is_member).toBe(false);
    expect((await near(stage.guyToken, 'latitude=91&longitude=0')).statusCode).toBe(400);
    expect(
      (await near(stage.guyToken, 'latitude=52.5&longitude=-0.07&radius_km=1')).json().items,
    ).toHaveLength(1);
  });
});
