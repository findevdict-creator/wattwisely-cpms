import { TestData, TestDatabase, TestPerson } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Story SEC-01: who did what, newest first, one page at a time. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Audit log', () => {
  const api = new TestApi();
  let olivia: TestPerson;
  let token: string;

  beforeAll(async () => {
    await api.start();
    const acme = await api.data.tenant('acme-charging');
    const volt = await api.data.tenant('volt-hotels');
    olivia = await api.data.person('olivia@acme.test', 'Olivia Owner');
    await api.data.member(acme, olivia, TestData.ROLE_IDS.owner);
    await api.data.sql(
      `insert into audit_log (id, tenant_id, actor_type, actor_label, action, target_type)
       values (gen_random_uuid(), $1, 'system', 'other tenant', 'team.member_invited', 'member')`,
      [volt],
    );
    token = await api.issuer.signFor(olivia);
    for (const email of ['a@acme.test', 'b@acme.test', 'c@acme.test']) {
      await api.call('POST', '/v1/members/invites', {
        token,
        body: { email, roles: [{ role_id: TestData.ROLE_IDS.readOnly }] },
      });
    }
  });

  afterAll(async () => api.stop());

  it('pages through this tenant’s entries, newest first, without other tenants’ entries', async () => {
    const first = (await api.call('GET', '/v1/audit-log?limit=2', { token })).json();
    const second = (
      await api.call('GET', `/v1/audit-log?limit=2&cursor=${first.next_cursor}`, { token })
    ).json();

    expect(first.items.map((item: { target_label: string }) => item.target_label)).toEqual([
      'c@acme.test',
      'b@acme.test',
    ]);
    expect(second.items).toHaveLength(1);
    expect(second.next_cursor).toBeNull();
    expect(first.items[0]).toMatchObject({
      actor_type: 'user',
      actor_id: olivia.accountId,
      actor_label: expect.stringContaining('Olivia'),
      action: 'team.member_invited',
      target_type: 'member',
    });
    expect(first.items[0].after).toBeUndefined();
  });

  it('shows the before and after of one entry', async () => {
    const list = (await api.call('GET', '/v1/audit-log?limit=1', { token })).json();

    const entry = (await api.call('GET', `/v1/audit-log/${list.items[0].id}`, { token })).json();

    expect(entry).toMatchObject({
      before: null,
      after: { status: 'invited', roles: [expect.objectContaining({ key: 'read-only' })] },
    });
  });

  it('refuses a malformed cursor', async () => {
    const response = await api.call('GET', '/v1/audit-log?cursor=nonsense', { token });

    expect(response.statusCode).toBe(400);
  });
});
