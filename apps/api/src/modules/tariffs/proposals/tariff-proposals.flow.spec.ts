import { ManagedFixture } from '../../managed/managed.fixture';
import { TestTariffBodies } from '../../../testing/test-tariff-bodies';

/** Story MGT-03: under the agreement, a Managed operator's price change is a proposal for the Owner. */
(ManagedFixture.isConfigured() ? describe : describe.skip)('Tariff proposals', () => {
  const fixture = new ManagedFixture();
  const { api } = fixture;
  let proposalId: string;
  let tariffId: string;

  beforeAll(async () => {
    await fixture.start();
    const service = await api.managed.service(fixture.acme, fixture.samStaffId, 'active');
    await api.managed.operator(fixture.acme, service, fixture.sam);
  });
  afterAll(() => fixture.stop());

  it('turns the operator’s new tariff into a proposal and tells the Owner', async () => {
    const direct = await api.call(
      'POST',
      '/v1/tariffs',
      fixture.asSam(TestTariffBodies.tariff('Standard')),
    );
    const proposed = await api.call(
      'POST',
      '/v1/tariff-proposals',
      fixture.asSam({ ...TestTariffBodies.tariff('Standard'), note: 'Market rates' }),
    );
    const nameless = await api.call(
      'POST',
      '/v1/tariff-proposals',
      fixture.asSam({ prices: TestTariffBodies.prices() }),
    );
    const list = await api.call('GET', '/v1/tariff-proposals?status=proposed', fixture.asOwner());

    expect(direct.statusCode).toBe(403);
    expect(direct.json()).toMatchObject({ code: 'tariff_approval_required' });
    expect(proposed.statusCode).toBe(201);
    expect(proposed.json()).toMatchObject({
      status: 'proposed',
      tariff_id: null,
      name: 'Standard',
      currency: 'GBP',
      note: 'Market rates',
      proposed_by: 'Sam Support',
      prices: { tax_rate: '20', bands: [{ name: 'Off-peak' }, { name: 'Peak' }] },
    });
    expect(nameless.statusCode).toBe(422);
    expect(list.json()).toHaveLength(1);
    expect(fixture.mailsToOwner()).toEqual(['Tariff change proposed: Standard']);
    proposalId = proposed.json().id;
  });

  it('creates the tariff when the Owner approves, as the Owner’s own change', async () => {
    const asSam = await api.call(
      'POST',
      `/v1/tariff-proposals/${proposalId}/approve`,
      fixture.asSam({}, 1),
    );
    const approved = await api.call(
      'POST',
      `/v1/tariff-proposals/${proposalId}/approve`,
      fixture.asOwner({ comment: 'Fine' }, 1),
    );
    const twice = await api.call(
      'POST',
      `/v1/tariff-proposals/${proposalId}/approve`,
      fixture.asOwner({}, 2),
    );
    const tariffs = await api.call('GET', '/v1/tariffs', fixture.asOwner());
    const log = await api.call(
      'GET',
      '/v1/audit-log?action=tariffs.created,tariff_proposals.approved',
      fixture.asOwner(),
    );

    expect(asSam.statusCode).toBe(403);
    expect(approved.statusCode).toBe(200);
    expect(approved.json()).toMatchObject({
      status: 'approved',
      decided_by: 'Olivia Owner',
      decision_comment: 'Fine',
      applied_tariff_id: expect.any(String),
    });
    expect(twice.statusCode).toBe(409);
    expect(tariffs.json().items).toEqual([
      expect.objectContaining({
        name: 'Standard',
        current_version: expect.objectContaining({ number: 1 }),
      }),
    ]);
    expect(
      log
        .json()
        .items.map((item: { action: string; actor_type: string }) => [
          item.action,
          item.actor_type,
        ]),
    ).toEqual([
      ['tariff_proposals.approved', 'user'],
      ['tariffs.created', 'user'],
    ]);
    tariffId = approved.json().applied_tariff_id;
  });

  it('adds a version when approving new prices, and keeps a rejection with its comment', async () => {
    const prices = TestTariffBodies.prices({ start_fee: 50 });
    const newPrices = await api.call(
      'POST',
      '/v1/tariff-proposals',
      fixture.asSam({ tariff_id: tariffId, prices }),
    );
    const approved = await api.call(
      'POST',
      `/v1/tariff-proposals/${newPrices.json().id}/approve`,
      fixture.asOwner({}, 1),
    );
    const tariff = await api.call('GET', `/v1/tariffs/${tariffId}`, fixture.asOwner());
    const another = await api.call(
      'POST',
      '/v1/tariff-proposals',
      fixture.asSam({ tariff_id: tariffId, prices }),
    );
    const silent = await api.call(
      'POST',
      `/v1/tariff-proposals/${another.json().id}/reject`,
      fixture.asOwner({}, 1),
    );
    const rejected = await api.call(
      'POST',
      `/v1/tariff-proposals/${another.json().id}/reject`,
      fixture.asOwner({ comment: 'Too high' }, 1),
    );
    const third = await api.call(
      'POST',
      '/v1/tariff-proposals',
      fixture.asSam({ tariff_id: tariffId, prices }),
    );
    const withdrawn = await api.call(
      'POST',
      `/v1/tariff-proposals/${third.json().id}/withdraw`,
      fixture.asSam(undefined, 1),
    );

    expect(newPrices.statusCode).toBe(201);
    expect(newPrices.json()).toMatchObject({ tariff_id: tariffId, name: 'Standard' });
    expect(approved.statusCode).toBe(200);
    expect(tariff.json().current_version).toMatchObject({ number: 2, start_fee: 50 });
    expect(silent.statusCode).toBe(422);
    expect(rejected.json()).toMatchObject({ status: 'rejected', decision_comment: 'Too high' });
    expect(withdrawn.json()).toMatchObject({ status: 'withdrawn' });
  });

  it('lets the operator change prices directly once the agreement no longer needs approval, and tells the Owner', async () => {
    const url = `/v1/admin/tenants/${fixture.acme}/managed-service`;
    const current = (await api.call('GET', url, fixture.asAdmin())).json();
    const relaxed = await api.call(
      'PATCH',
      url,
      fixture.asAdmin({ is_tariff_approval_required: false }, current.version),
    );
    const created = await api.call(
      'POST',
      '/v1/tariffs',
      fixture.asSam(TestTariffBodies.tariff('Night')),
    );
    const log = await api.call(
      'GET',
      '/v1/audit-log?action=tariffs.created&actor_type=managed',
      fixture.asOwner(),
    );

    expect(relaxed.statusCode).toBe(200);
    expect(relaxed.json()).toMatchObject({ is_tariff_approval_required: false });
    expect(created.statusCode).toBe(201);
    expect(log.json().items).toHaveLength(1);
    expect(fixture.mailsToOwner().at(-1)).toBe('Tariff changed by Wattwisely: Night');
  });
});
