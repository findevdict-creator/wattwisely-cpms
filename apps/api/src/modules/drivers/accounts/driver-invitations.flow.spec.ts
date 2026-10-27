import { TestDatabase } from '@wattwisely/db/testing';
import { DriverAccountsFixture } from './driver-accounts.fixture';

/**
 * Module 19, the rest of stories DRV-04 and DRV-05: resending and cancelling an invitation,
 * declining and leaving from the driver's side, what is refused, and the payment mode that
 * drivers, cards and groups carry (story DRV-07). The first half is driver-accounts.flow.spec.ts.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('Driver invitations', () => {
  const stage = new DriverAccountsFixture();
  const { api } = stage;
  const dana = DriverAccountsFixture.DANA;

  beforeAll(() => stage.start());
  afterAll(() => stage.stop());

  it('resends with a fresh link, cancels, and refuses what no longer applies', async () => {
    const resend = () =>
      api.call('POST', `/v1/drivers/${stage.driverId}/invite/resend`, { token: stage.owner });
    const cancel = () =>
      api.call('DELETE', `/v1/drivers/${stage.driverId}/invite`, { token: stage.owner });
    const noInvitation = await resend();
    await stage.invite({ email: 'dana.work@example.com' });
    const first = api.mail.lastInvitationToken('dana.work@example.com');
    const resent = await resend();
    const second = api.mail.lastInvitationToken('dana.work@example.com');

    expect(noInvitation.json().code).toBe('driver_not_invited');
    expect(resent.statusCode).toBe(200);
    expect(second).not.toBe(first);
    expect((await stage.preview(first)).statusCode).toBe(404);
    expect((await stage.preview(second)).statusCode).toBe(200);
    expect((await cancel()).statusCode).toBe(204);
    expect((await stage.preview(second)).statusCode).toBe(404);
    expect((await stage.driver()).json().account.status).toBe('none');
    expect((await cancel()).json().code).toBe('driver_not_invited');
  });

  it('lets the driver decline, or leave an operator later', async () => {
    await stage.invite();
    const declined = await stage.answer('decline');
    await stage.invite();
    const accepted = await stage.answer('accept');
    const left = await api.call('DELETE', `/v1/driver/operators/${stage.acme}`, {
      token: stage.danaToken,
    });

    expect(declined.statusCode).toBe(204);
    expect(accepted.statusCode).toBe(200);
    expect(left.statusCode).toBe(204);
    expect((await stage.driver()).json().account.status).toBe('none');
    expect(await stage.auditActions()).toEqual([
      'drivers.invited:user',
      'drivers.invitation_resent:user',
      'drivers.invitation_cancelled:user',
      'drivers.invited:user',
      'drivers.invitation_declined:driver',
      'drivers.invited:user',
      'drivers.invitation_accepted:driver',
      'drivers.unlinked:driver',
    ]);
  });

  it('needs an address to invite to, and refuses a driver that is already linked', async () => {
    const nameless = await api.call('POST', '/v1/drivers', {
      token: stage.owner,
      body: { name: 'Nobody' },
    });
    const noAddress = await api.call('POST', `/v1/drivers/${nameless.json().id}/invite`, {
      token: stage.owner,
      body: {},
    });
    await stage.invite();
    await stage.answer('accept');
    const linked = await stage.invite();

    expect(noAddress.statusCode).toBe(422);
    expect(noAddress.json().code).toBe('driver_email_required');
    expect(linked.json().code).toBe('driver_already_linked');
  });

  it('carries a payment mode on drivers, cards and groups, inherit by default', async () => {
    const current = (await stage.driver()).json();
    const paid = await api.call('PATCH', `/v1/drivers/${stage.driverId}`, {
      token: stage.owner,
      version: current.version,
      body: { payment_mode: 'free' },
    });
    const card = await api.call('POST', `/v1/drivers/${stage.driverId}/cards`, {
      token: stage.owner,
      body: { id_tag: 'POOL-1', payment_mode: 'free' },
    });
    const group = await api.call('POST', '/v1/access-groups', {
      token: stage.owner,
      body: {
        name: 'Depot staff',
        payment_mode: 'pay',
        hold_amount: 2000,
        driver_ids: [stage.driverId],
      },
    });
    const badHold = await api.call('POST', '/v1/access-groups', {
      token: stage.owner,
      body: { name: 'Bad', hold_amount: 0 },
    });

    expect(current.payment_mode).toBe('inherit');
    expect(paid.json().payment_mode).toBe('free');
    expect(card.json().payment_mode).toBe('free');
    expect(group.json()).toMatchObject({ payment_mode: 'pay', hold_amount: 2000 });
    expect(badHold.statusCode).toBe(400);
    const cleared = await api.call('PATCH', `/v1/access-groups/${group.json().id}`, {
      token: stage.owner,
      version: group.json().version,
      body: { hold_amount: null, payment_mode: 'inherit' },
    });
    expect(cleared.json()).toMatchObject({ payment_mode: 'inherit', hold_amount: null });
    const profile = await api.call('GET', `/v1/driver/operators/${stage.acme}/profile`, {
      token: stage.danaToken,
    });
    expect(profile.json()).toMatchObject({
      payment_mode: 'free',
      groups: ['Depot staff'],
      cards: [{ id_tag: 'POOL-1', label: '', status: 'active' }],
    });
    expect(dana.email).toBe(profile.json().email);
  });
});
