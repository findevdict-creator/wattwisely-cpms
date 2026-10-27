import { TestData, TestDatabase } from '@wattwisely/db/testing';
import { TestWorker } from '../testing/test-worker';
import { ManagedServiceEndJob } from './managed-service-end.job';

/** Story MGT-05: on the end date, the worker ends the agreement and removes Wattwisely's staff. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Managed service end job', () => {
  const worker = new TestWorker();
  let acme: string;
  let volt: string;
  let dueService: string;
  let laterService: string;

  beforeAll(async () => {
    await worker.start();
    const manager = await worker.data.person('ana@wattwisely.test', 'Ana');
    const managerStaffId = await worker.platform.staff(manager, 'admin');
    acme = await worker.data.tenant('acme-charging');
    volt = await worker.data.tenant('volt-hotels');
    const owner = await worker.data.person('olivia@acme.test', 'Olivia');
    await worker.data.member(acme, owner, TestData.ROLE_IDS.owner);
    dueService = await worker.managed.service(acme, managerStaffId, 'ending', {
      endsAt: new Date(Date.now() - 60_000),
    });
    laterService = await worker.managed.service(volt, managerStaffId, 'ending', {
      endsAt: new Date(Date.now() + 86_400_000),
    });
    const sam = await worker.data.person('sam@wattwisely.test', 'Sam');
    await worker.managed.operator(acme, dueService, sam);
    await worker.managed.operator(volt, laterService, sam);
  });

  afterAll(async () => {
    await worker.stop();
  });

  it('ends only the agreements whose date has passed, removing their operators and logging it', async () => {
    expect(await worker.app.get(ManagedServiceEndJob).runOnce(new Date())).toBe(1);
    expect(await worker.app.get(ManagedServiceEndJob).runOnce(new Date())).toBe(0);

    expect(
      await worker.row('select status from managed_services where id = $1', [dueService]),
    ).toEqual({
      status: 'ended',
    });
    expect(
      await worker.row('select status from managed_services where id = $1', [laterService]),
    ).toEqual({
      status: 'ending',
    });
    expect(
      await worker.row(
        `select m.status, (select count(*)::int from membership_roles r where r.membership_id = m.id) as roles
         from tenant_memberships m join managed_operators o on o.membership_id = m.id where o.tenant_id = $1`,
        [acme],
      ),
    ).toEqual({ status: 'removed', roles: 0 });
    expect(
      await worker.row(
        'select status from tenant_memberships m join managed_operators o on o.membership_id = m.id where o.tenant_id = $1',
        [volt],
      ),
    ).toEqual({ status: 'active' });
    expect(
      await worker.row(
        `select actor_type, actor_label, action, after->>'operators_removed' as removed from audit_log where tenant_id = $1`,
        [acme],
      ),
    ).toEqual({
      actor_type: 'system',
      actor_label: 'Wattwisely (automatic)',
      action: 'managed_service.ended',
      removed: '1',
    });
  });
});
