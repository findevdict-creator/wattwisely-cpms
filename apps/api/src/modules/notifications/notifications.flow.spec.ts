import { TestData, TestDatabase, TestPerson } from '@wattwisely/db/testing';
import { TestApi } from '../../testing/test-api';

/** Story NTF-03: each member's portal inbox and quiet hours. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Notifications', () => {
  const api = new TestApi();
  let acme: string;
  let olivia: { token: string; membershipId: string };
  let tom: { token: string; membershipId: string };

  const member = async (email: string, roleId: string) => {
    const person: TestPerson = await api.data.person(email);
    const membershipId = await api.data.member(acme, person, roleId);
    return { token: await api.issuer.signFor(person), membershipId };
  };

  const inboxLine = (membershipId: string, title: string) =>
    api.data.sql(
      `insert into staff_notifications (id, tenant_id, membership_id, kind, title, link)
       values (gen_random_uuid(), $1, $2, 'alert_opened', $3, '/alerts')`,
      [acme, membershipId, title],
    );

  beforeAll(async () => {
    await api.start();
    acme = await api.data.tenant('acme-charging');
    olivia = await member('olivia@acme.test', TestData.ROLE_IDS.owner);
    tom = await member('tom@acme.test', TestData.ROLE_IDS.technician);
    await inboxLine(olivia.membershipId, 'CP-1 is offline');
    await inboxLine(olivia.membershipId, 'CP-2 is offline');
    await inboxLine(tom.membershipId, 'For Tom only');
  });

  afterAll(async () => api.stop());

  it('shows each member only their own lines, with the unread count', async () => {
    const page = await api.call('GET', '/v1/notifications', { token: olivia.token });

    expect(page.json().unread_count).toBe(2);
    expect(page.json().items.map((item: { title: string }) => item.title)).toEqual([
      'CP-2 is offline',
      'CP-1 is offline',
    ]);
  });

  it('marks one line read, then all of them', async () => {
    const page = await api.call('GET', '/v1/notifications', { token: olivia.token });
    const first = page.json().items[0].id;

    const one = await api.call('POST', `/v1/notifications/${first}/read`, { token: olivia.token });
    const notMine = await api.call('POST', `/v1/notifications/${first}/read`, { token: tom.token });
    const all = await api.call('POST', '/v1/notifications/read-all', { token: olivia.token });
    const unread = await api.call('GET', '/v1/notifications?unread=true', { token: olivia.token });

    expect(one.json()).toEqual({ marked: 1, unread_count: 1 });
    expect(notMine.json()).toEqual({ marked: 0, unread_count: 1 });
    expect(all.json()).toEqual({ marked: 1, unread_count: 0 });
    expect(unread.json().items).toEqual([]);
  });

  it('saves quiet hours, and refuses half of them', async () => {
    const before = await api.call('GET', '/v1/notification-settings', { token: tom.token });
    const saved = await api.call('PUT', '/v1/notification-settings', {
      token: tom.token,
      body: { quiet_hours_start: '22:00', quiet_hours_end: '07:00', time_zone: 'Europe/London' },
    });
    const half = await api.call('PUT', '/v1/notification-settings', {
      token: tom.token,
      body: { quiet_hours_start: '22:00', time_zone: 'Europe/London' },
    });
    const after = await api.call('GET', '/v1/notification-settings', { token: tom.token });

    expect(before.json()).toEqual({
      quiet_hours_start: null,
      quiet_hours_end: null,
      time_zone: 'UTC',
    });
    expect(saved.statusCode).toBe(200);
    expect(half.statusCode).toBe(400);
    expect(after.json()).toEqual({
      quiet_hours_start: '22:00',
      quiet_hours_end: '07:00',
      time_zone: 'Europe/London',
    });
  });
});
