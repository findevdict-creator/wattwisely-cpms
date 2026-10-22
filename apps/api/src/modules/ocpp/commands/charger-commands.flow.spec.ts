import { Client } from 'pg';
import { TestData, TestDatabase, TestPerson } from '@wattwisely/db/testing';
import { NotifyChannels } from '@wattwisely/ocpp-contracts';
import { TestApi } from '../../../testing/test-api';

/** Commands end to end at the API: permission at the site, the row, the audit entry, the gateway hand-off. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Charger commands', () => {
  const api = new TestApi();
  const notifications: string[] = [];
  let listener: Client;
  let acme: string;
  let riverside: string;
  let chargerId: string;
  let connectorId: string;
  let ownerToken: string;
  let technicianToken: string;

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    riverside = await api.data.site(acme, 'Riverside');
    const depot = await api.data.site(acme, 'Depot North');
    chargerId = await api.data.charger(acme, riverside, 'WW-CMD');
    const owner = await api.data.person('olivia@acme.test', 'Olivia Owner');
    await api.data.member(acme, owner, TestData.ROLE_IDS.owner);
    ownerToken = await api.issuer.signFor(owner);
    const technician: TestPerson = await api.data.person('tom@acme.test', 'Tom Tech');
    await api.data.member(acme, technician, TestData.ROLE_IDS.technician, depot);
    technicianToken = await api.issuer.signFor(technician);
    const connector = await api.call('POST', `/v1/chargers/${chargerId}/connectors`, {
      token: ownerToken,
      body: {},
    });
    connectorId = connector.json().id;
    listener = new Client({ connectionString: api.database.urlFor('wattwisely_app') });
    await listener.connect();
    listener.on('notification', (notification) => notifications.push(notification.payload ?? ''));
    await listener.query(`listen ${NotifyChannels.COMMANDS}`);
  });

  afterAll(async () => {
    await listener?.end();
    await api.stop();
  });

  const online = (isOnline: boolean) =>
    isOnline
      ? api.data.sql(
          `insert into charger_connections (charger_id, tenant_id, instance_id, connection_id, ocpp_version, is_booted, lease_expires_at)
           values ($1, $2, 'gateway-test', gen_random_uuid(), '1.6', true, now() + interval '1 minute')
           on conflict (charger_id) do update set lease_expires_at = excluded.lease_expires_at`,
          [chargerId, acme],
        )
      : api.data.sql('delete from charger_connections where charger_id = $1', [chargerId]);

  it('queues a remote start, records who asked, and tells the gateway', async () => {
    await online(true);
    const response = await api.call('POST', `/v1/chargers/${chargerId}/commands/remote-start`, {
      token: ownerToken,
      body: { connector_id: connectorId },
    });
    expect(response.statusCode).toBe(202);
    const command = response.json();
    expect(command).toMatchObject({
      charger_id: chargerId,
      action: 'remote_start',
      status: 'queued',
      requested_by_label: 'Olivia Owner <olivia@acme.test>',
      payload: { ocpp_connector_id: 1, id_tag: expect.stringMatching(/^WW[A-Z0-9]+$/) },
    });

    await new Promise((resolve) => setTimeout(resolve, 100));
    expect(notifications.map((payload) => JSON.parse(payload))).toContainEqual({
      command_id: command.id,
      charger_id: chargerId,
      tenant_id: acme,
    });
    const audit = await api.data.sql(
      `select action, target_id from audit_log where action = 'chargers.command_sent' and tenant_id = $1`,
      [acme],
    );
    expect(audit.rows).toEqual([{ action: 'chargers.command_sent', target_id: chargerId }]);

    const fetched = await api.call('GET', `/v1/commands/${command.id}`, { token: ownerToken });
    expect(fetched.json()).toMatchObject({ id: command.id, status: 'queued' });
    const listed = await api.call('GET', `/v1/chargers/${chargerId}/commands?action=remote_start`, {
      token: ownerToken,
    });
    expect(listed.json().items.map((item: { id: string }) => item.id)).toEqual([command.id]);
  });

  it('refuses a reset for an offline charger, but queues commands that may wait', async () => {
    await online(false);
    const reset = await api.call('POST', `/v1/chargers/${chargerId}/commands/reset`, {
      token: ownerToken,
      body: { type: 'soft' },
    });
    expect(reset.statusCode).toBe(409);
    expect(reset.json()).toMatchObject({ code: 'charger_offline' });

    const unlock = await api.call('POST', `/v1/chargers/${chargerId}/commands/unlock`, {
      token: ownerToken,
      body: { connector_id: connectorId },
    });
    expect(unlock.statusCode).toBe(202);
    expect(unlock.json()).toMatchObject({
      action: 'unlock',
      status: 'queued',
      payload: { ocpp_connector_id: 1 },
    });
  });

  it('answers 422 for a connector or session that is not the charger’s', async () => {
    const other = await api.call('POST', `/v1/chargers/${chargerId}/commands/unlock`, {
      token: ownerToken,
      body: { connector_id: '00000000-0000-7000-8000-000000000099' },
    });
    expect(other.statusCode).toBe(422);
    expect(other.json()).toMatchObject({ code: 'connector_not_found' });

    const stop = await api.call('POST', `/v1/chargers/${chargerId}/commands/remote-stop`, {
      token: ownerToken,
      body: { session_id: '00000000-0000-7000-8000-000000000099' },
    });
    expect(stop.statusCode).toBe(422);
    expect(stop.json()).toMatchObject({ code: 'session_not_active' });
  });

  it('shows a queued command as expired once its time ran out', async () => {
    const { rows } = await api.data.sql(
      `update charger_commands set queued_until = now() - interval '1 second' where charger_id = $1 and status = 'queued' returning id`,
      [chargerId],
    );
    const fetched = await api.call('GET', `/v1/commands/${rows[0].id}`, { token: ownerToken });
    expect(fetched.json()).toMatchObject({ status: 'expired', completed_at: expect.any(String) });
  });

  it('needs chargers:command at the charger’s site', async () => {
    const response = await api.call(
      'POST',
      `/v1/chargers/${chargerId}/commands/change-availability`,
      {
        token: technicianToken,
        body: { operative: false },
      },
    );
    expect(response.statusCode).toBe(404);
    const unknown = await api.call('GET', '/v1/commands/00000000-0000-7000-8000-000000000099', {
      token: ownerToken,
    });
    expect(unknown.statusCode).toBe(404);
  });
});
