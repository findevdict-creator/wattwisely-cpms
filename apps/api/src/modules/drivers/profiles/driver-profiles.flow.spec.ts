import {
  TestData,
  TestDatabase,
  TestDrivers,
  TestPerson,
  TestSessions,
} from '@wattwisely/db/testing';
import { TestApi } from '../../../testing/test-api';

/** Stories DRV-01 to DRV-03: driver profiles, their personal data, their RFID cards, blocking and deleting. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Drivers', () => {
  const api = new TestApi();
  let acme: string;
  let owner: string;
  let technician: string;
  let dana: { id: string; version: number };

  const tokenFor = async (email: string, roleId: string) => {
    const person: TestPerson = await api.data.person(email, email.split('@')[0]);
    await api.data.member(acme, person, roleId);
    return api.issuer.signFor(person);
  };

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    owner = await tokenFor('olivia@acme.test', TestData.ROLE_IDS.owner);
    technician = await tokenFor('tom@acme.test', TestData.ROLE_IDS.technician);
  });

  afterAll(async () => api.stop());

  it('creates a driver and lists them by name', async () => {
    const created = await api.call('POST', '/v1/drivers', {
      token: owner,
      body: { name: '  Dana Driver ', email: 'dana@example.com', phone: '', reference: 'EMP-42' },
    });
    await api.call('POST', '/v1/drivers', { token: owner, body: { name: 'Bob Builder' } });

    expect(created.statusCode).toBe(201);
    expect(created.json()).toMatchObject({
      name: 'Dana Driver',
      email: 'dana@example.com',
      phone: null,
      reference: 'EMP-42',
      status: 'active',
      card_count: 0,
      groups: [],
      cards: [],
      is_personal_data_hidden: false,
      version: 1,
    });
    dana = { id: created.json().id, version: 1 };
    const list = await api.call('GET', '/v1/drivers', { token: owner });
    expect(list.json().items.map((driver: { name: string }) => driver.name)).toEqual([
      'Bob Builder',
      'Dana Driver',
    ]);
    const found = await api.call('GET', '/v1/drivers?q=emp-4', { token: owner });
    expect(found.json().items.map((driver: { id: string }) => driver.id)).toEqual([dana.id]);
  });

  it('hides e-mail and phone from roles without drivers:read_personal', async () => {
    const list = await api.call('GET', '/v1/drivers', { token: technician });
    const detail = await api.call('GET', `/v1/drivers/${dana.id}`, { token: technician });

    expect(list.statusCode).toBe(200);
    expect(list.json().items[1]).toMatchObject({
      name: 'Dana Driver',
      email: null,
      is_personal_data_hidden: true,
    });
    expect(detail.json()).toMatchObject({
      email: null,
      phone: null,
      is_personal_data_hidden: true,
    });
    const write = await api.call('POST', '/v1/drivers', { token: technician, body: { name: 'X' } });
    expect(write.statusCode).toBe(403);
  });

  it('refuses a second driver with the same e-mail address', async () => {
    const response = await api.call('POST', '/v1/drivers', {
      token: owner,
      body: { name: 'Dana Again', email: 'DANA@example.com' },
    });

    expect(response.statusCode).toBe(409);
    expect(response.json().code).toBe('driver_email_taken');
  });

  it('registers cards once per tag, and changes their state', async () => {
    const added = await api.call('POST', `/v1/drivers/${dana.id}/cards`, {
      token: owner,
      body: { id_tag: '04A1B2C3', label: 'Blue card' },
    });
    const twice = await api.call('POST', `/v1/drivers/${dana.id}/cards`, {
      token: owner,
      body: { id_tag: '04a1b2c3' },
    });
    const badTag = await api.call('POST', `/v1/drivers/${dana.id}/cards`, {
      token: owner,
      body: { id_tag: 'this tag is far too long for OCPP' },
    });

    expect(added.statusCode).toBe(201);
    expect(added.json()).toMatchObject({
      id_tag: '04A1B2C3',
      label: 'Blue card',
      status: 'active',
    });
    expect(twice.json().code).toBe('card_tag_taken');
    expect(badTag.statusCode).toBe(400);

    const lost = await api.call('PATCH', `/v1/drivers/${dana.id}/cards/${added.json().id}`, {
      token: owner,
      body: { status: 'lost', expires_at: '2027-01-01T00:00:00Z' },
      version: 1,
    });
    expect(lost.json()).toMatchObject({
      status: 'lost',
      expires_at: '2027-01-01T00:00:00.000Z',
      version: 2,
    });
    const detail = await api.call('GET', `/v1/drivers/${dana.id}`, { token: owner });
    expect(detail.json()).toMatchObject({ card_count: 1, active_card_count: 0 });
    expect(detail.json().cards).toHaveLength(1);
  });

  it('blocks and unblocks a driver with a reason, once', async () => {
    const blocked = await api.call('POST', `/v1/drivers/${dana.id}/block`, {
      token: owner,
      body: { reason: 'Left the company' },
      version: dana.version,
    });
    const again = await api.call('POST', `/v1/drivers/${dana.id}/block`, {
      token: owner,
      body: {},
      version: blocked.json().version,
    });

    expect(blocked.statusCode).toBe(200);
    expect(blocked.json()).toMatchObject({
      status: 'blocked',
      blocked_by: 'olivia',
      block_reason: 'Left the company',
      version: 2,
    });
    expect(again.json().code).toBe('driver_already_blocked');
    const unblocked = await api.call('POST', `/v1/drivers/${dana.id}/unblock`, {
      token: owner,
      version: 2,
    });
    expect(unblocked.json()).toMatchObject({ status: 'active', block_reason: '', version: 3 });
    dana.version = 3;
    const tech = await api.call('POST', `/v1/drivers/${dana.id}/block`, {
      token: technician,
      body: {},
      version: 3,
    });
    expect(tech.statusCode).toBe(403);
  });

  it('lists a driver’s sessions, and names the driver on them', async () => {
    const site = await api.data.site(acme, 'Riverside');
    const chargerId = await api.data.charger(acme, site, 'CP-1');
    const connectorId = await api.data.connector(acme, chargerId, 1);
    const sessionId = await new TestSessions(api.data).create({
      tenantId: acme,
      siteId: site,
      chargerId,
      connectorId,
    });
    await api.data.sql('update charging_sessions set driver_id = $1 where id = $2', [
      dana.id,
      sessionId,
    ]);

    const sessions = await api.call('GET', `/v1/sessions?driver_id=${dana.id}`, { token: owner });
    const detail = await api.call('GET', `/v1/drivers/${dana.id}`, { token: owner });

    expect(sessions.json().items).toHaveLength(1);
    expect(sessions.json().items[0]).toMatchObject({
      driver_id: dana.id,
      driver_name: 'Dana Driver',
    });
    expect(detail.json().last_session_at).toBe('2026-03-10T16:30:00.000Z');
  });

  it('deletes a driver: gone from lists, cards blocked, sessions keep the name', async () => {
    const drivers = new TestDrivers(api.data);
    const cardId = await drivers.card(acme, dana.id, 'DANA-2');
    const removed = await api.call('DELETE', `/v1/drivers/${dana.id}`, {
      token: owner,
      version: dana.version,
    });

    expect(removed.statusCode).toBe(204);
    expect((await api.call('GET', `/v1/drivers/${dana.id}`, { token: owner })).statusCode).toBe(
      404,
    );
    const list = await api.call('GET', '/v1/drivers', { token: owner });
    expect(list.json().items.map((driver: { name: string }) => driver.name)).toEqual([
      'Bob Builder',
    ]);
    const { rows } = await api.data.sql('select status from rfid_cards where id = $1', [cardId]);
    expect(rows[0]['status']).toBe('blocked');
    const sessions = await api.call('GET', `/v1/sessions?driver_id=${dana.id}`, { token: owner });
    expect(sessions.json().items[0].driver_name).toBe('Dana Driver');
    const audit = await api.call('GET', '/v1/audit-log?target_type=driver', { token: owner });
    expect(audit.json().items.map((entry: { action: string }) => entry.action)).toEqual(
      expect.arrayContaining(['drivers.created', 'drivers.blocked', 'drivers.deleted']),
    );
  });
});
