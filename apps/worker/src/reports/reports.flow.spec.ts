import { gunzipSync } from 'node:zlib';
import { TestData, TestDatabase } from '@wattwisely/db/testing';
import { NotificationSendJob } from '../notifications/notification-send.job';
import { TestWorker } from '../testing/test-worker';
import { ReportExportJob } from './report-export.job';
import { ReportScheduleJob } from './report-schedule.job';

/** Story SES-04 and the PRD's scheduled reports: files built in the background and sent. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Report jobs', () => {
  const worker = new TestWorker();
  let acme: string;
  let site: string;
  let olivia: { accountId: string };
  let oliviaMembership: string;

  const exportJob = () => worker.app.get(ReportExportJob).runOnce(new Date());
  const file = async (exportId: string) => {
    const row = await worker.row('select data from report_exports where id = $1', [exportId]);
    return gunzipSync(row?.['data'] as Buffer).toString('utf8');
  };

  beforeAll(async () => {
    await worker.start();
    acme = await worker.data.tenant('acme-charging');
    site = await worker.data.site(acme, 'Riverside');
    const charger = await worker.data.charger(acme, site, 'CP-1');
    const connector = await worker.data.connector(acme, charger, 1);
    await worker.sessions.create(
      { tenantId: acme, siteId: site, chargerId: charger, connectorId: connector },
      { status: 'completed' },
    );
    const person = await worker.data.person('olivia@acme.test', 'Olivia');
    olivia = person;
    oliviaMembership = await worker.data.member(acme, person, TestData.ROLE_IDS.owner);
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('builds a sessions export in the background and tells the member who asked', async () => {
    const exportId = await worker.notifications.export(
      acme,
      'sessions',
      { siteIds: [site], from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
      { accountId: olivia.accountId, membershipId: oliviaMembership },
    );

    expect(await exportJob()).toBe(1);
    expect(await exportJob()).toBe(0);

    expect(
      await worker.row(
        `select status, row_count, expires_at > now() + interval '6 days' as is_kept from report_exports where id = $1`,
        [exportId],
      ),
    ).toEqual({ status: 'ready', row_count: 1, is_kept: true });
    const csv = await file(exportId);
    expect(csv.split('\r\n')).toHaveLength(2);
    expect(csv).toContain('Riverside,CP-1,A');
    expect(await worker.row('select title, link from staff_notifications')).toEqual({
      title: 'Your export sessions.csv is ready',
      link: `/reports?export=${exportId}`,
    });
    await worker.app.get(NotificationSendJob).runOnce(new Date());
    expect(worker.mail.to('olivia@acme.test')[0].text).toContain(
      `http://portal.test/reports?export=${exportId}`,
    );
  });

  it('queues a due schedule for the week just ended and mails the file to its recipients', async () => {
    const scheduleId = await worker.notifications.schedule(
      acme,
      ['finance@acme.test'],
      new Date('2026-03-16T00:00:00Z'),
    );

    expect(await worker.app.get(ReportScheduleJob).runOnce(new Date())).toBe(1);
    expect(await worker.app.get(ReportScheduleJob).runOnce(new Date())).toBe(0);

    const queued = await worker.row(
      'select id, parameters, file_name from report_exports where schedule_id = $1',
      [scheduleId],
    );
    expect(queued?.['parameters']).toEqual({
      from: '2026-03-09T00:00:00.000Z',
      to: '2026-03-16T00:00:00.000Z',
      groupBy: 'site',
      siteIds: null,
    });
    expect(queued?.['file_name']).toBe('usage-2026-03-09-to-2026-03-16.csv');
    expect(
      await worker.row(
        'select next_run_at > now() as is_later from report_schedules where id = $1',
        [scheduleId],
      ),
    ).toEqual({ is_later: true });

    await exportJob();
    expect((await file(queued?.['id'] as string)).split('\r\n')[1]).toMatch(
      /^Riverside,Riverside,1,1,1,22\.000,/,
    );
    await worker.app.get(NotificationSendJob).runOnce(new Date());
    const [mail] = worker.mail.to('finance@acme.test');
    expect(mail.subject).toBe('Weekly usage: usage-2026-03-09-to-2026-03-16.csv');
    expect(mail.attachments?.[0].filename).toBe('usage-2026-03-09-to-2026-03-16.csv.gz');
  });

  it('drops the file of an export older than seven days', async () => {
    await worker.data.sql(
      "update report_exports set expires_at = now() - interval '1 minute' where status = 'ready'",
    );

    await exportJob();

    expect(
      await worker.row(
        "select count(*)::int as n from report_exports where status = 'expired' and data is null",
      ),
    ).toEqual({ n: 2 });
  });
});
