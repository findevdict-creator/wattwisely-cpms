import { gunzipSync } from 'node:zlib';
import { TestData, TestDatabase, TestPerson } from '@wattwisely/db/testing';
import { NotificationSendJob } from '../notifications/notification-send.job';
import { TestWorker } from '../testing/test-worker';
import { ReportExportJob } from './report-export.job';
import { ReportScheduleJob } from './report-schedule.job';

/** Module 12: with object storage, export files leave Postgres; the row only names the key. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Report files in object storage', () => {
  const worker = new TestWorker(true);
  let acme: string;
  let site: string;
  let person: TestPerson;
  let membership: string;

  const exportJob = () => worker.app.get(ReportExportJob).runOnce(new Date());

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
    person = await worker.data.person('olivia@acme.test', 'Olivia');
    membership = await worker.data.member(acme, person, TestData.ROLE_IDS.owner);
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('writes the gzipped CSV to the bucket under the tenant, and leaves the row empty', async () => {
    const exportId = await worker.notifications.export(
      acme,
      'sessions',
      { siteIds: [site], from: '2026-03-01T00:00:00Z', to: '2026-04-01T00:00:00Z' },
      { accountId: person.accountId, membershipId: membership },
    );

    expect(await exportJob()).toBe(1);

    const key = `exports/${acme}/${exportId}.csv.gz`;
    expect(
      await worker.row(
        'select status, data, storage_key, size_bytes from report_exports where id = $1',
        [exportId],
      ),
    ).toEqual({
      status: 'ready',
      data: null,
      storage_key: key,
      size_bytes: worker.files.files.get(key)?.body.length,
    });
    const stored = worker.files.files.get(key);
    expect(stored?.contentType).toBe('application/gzip');
    expect(gunzipSync(stored?.body as Buffer).toString('utf8')).toContain('Riverside,CP-1,A');
  });

  it('attaches a scheduled report from the bucket', async () => {
    await worker.notifications.schedule(
      acme,
      ['finance@acme.test'],
      new Date('2026-03-16T00:00:00Z'),
    );
    await worker.app.get(ReportScheduleJob).runOnce(new Date());
    await exportJob();

    await worker.app.get(NotificationSendJob).runOnce(new Date());

    const [mail] = worker.mail.to('finance@acme.test');
    const attached = mail.attachments?.[0];
    expect(attached?.filename).toBe('usage-2026-03-09-to-2026-03-16.csv.gz');
    expect(gunzipSync(attached?.content as Buffer).toString('utf8')).toContain(
      'Riverside,Riverside,1,1,1,22.000',
    );
  });

  it('fails an export cleanly when the bucket cannot be written', async () => {
    const exportId = await worker.notifications.export(acme, 'audit_log', {
      from: '2026-03-01T00:00:00Z',
      to: '2026-04-01T00:00:00Z',
    });
    worker.files.isFailing = true;

    await exportJob();
    worker.files.isFailing = false;

    expect(
      await worker.row('select status, storage_key from report_exports where id = $1', [exportId]),
    ).toEqual({ status: 'failed', storage_key: null });
  });

  it('removes the files from the bucket when the exports expire', async () => {
    expect(worker.files.files.size).toBe(2);
    await worker.data.sql(
      "update report_exports set expires_at = now() - interval '1 minute' where status = 'ready'",
    );

    await exportJob();

    expect(worker.files.files.size).toBe(0);
    expect(
      await worker.row("select count(*)::int as n from report_exports where status = 'expired'"),
    ).toEqual({ n: 2 });
  });
});
