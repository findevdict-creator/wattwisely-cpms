import { TestDatabase } from '@wattwisely/db/testing';
import { DriverAccountsFixture } from './driver-accounts.fixture';

/**
 * Module 19, stories DRV-04 and DRV-05: an operator invites a driver to the app, the driver
 * accepts with their own login, both sides see the link, and the operator can end it. Also the
 * wall between the two kinds of token. The rest of the story is driver-invitations.flow.spec.ts.
 */
(TestDatabase.isConfigured() ? describe : describe.skip)('Driver accounts', () => {
  const stage = new DriverAccountsFixture();
  const { api } = stage;
  const dana = DriverAccountsFixture.DANA;

  beforeAll(() => stage.start());
  afterAll(() => stage.stop());

  it('keeps staff tokens and driver tokens apart', async () => {
    const staffOnDriverRoute = await api.call('GET', '/v1/driver/me', { token: stage.owner });
    const driverOnStaffRoute = await api.call('GET', '/v1/drivers', { token: stage.danaToken });
    const unverified = await api.call('GET', '/v1/driver/me', {
      token: await api.issuer.signForDriver({ ...dana, isEmailVerified: false }),
    });

    expect(staffOnDriverRoute.statusCode).toBe(403);
    expect(staffOnDriverRoute.json().code).toBe('staff_token_not_allowed');
    expect(driverOnStaffRoute.statusCode).toBe(403);
    expect(driverOnStaffRoute.json().code).toBe('driver_token_not_allowed');
    expect(unverified.json().code).toBe('email_unverified');
  });

  it('gives a driver an account at their first request, and lets them name themselves', async () => {
    const me = await api.call('GET', '/v1/driver/me', { token: stage.danaToken });
    const renamed = await api.call('PATCH', '/v1/driver/me', {
      token: stage.danaToken,
      body: { display_name: 'Dana D.', phone: ' +44 7700 900123 ' },
    });

    expect(me.statusCode).toBe(200);
    expect(me.json()).toMatchObject({ email: dana.email, display_name: 'Dana', phone: null });
    expect(renamed.json()).toMatchObject({ display_name: 'Dana D.', phone: '+44 7700 900123' });
    const again = await api.call('GET', '/v1/driver/me', { token: stage.danaToken });
    expect(again.json().display_name).toBe('Dana D.');
    const operators = await api.call('GET', '/v1/driver/operators', { token: stage.danaToken });
    expect(operators.json()).toEqual({ items: [] });
  });

  it('invites the driver to the app once, and anyone with the link may look at it', async () => {
    const invited = await stage.invite();
    const twice = await stage.invite();
    const byTechnician = await stage.invite({}, stage.technician);

    expect(invited.statusCode).toBe(201);
    expect(invited.json().is_email_sent).toBe(true);
    expect(invited.json().driver.account).toMatchObject({
      status: 'invited',
      email: dana.email,
      is_invitation_expired: false,
      linked_at: null,
    });
    expect(twice.json().code).toBe('driver_already_invited');
    expect(byTechnician.statusCode).toBe(403);
    const shown = await stage.preview(api.mail.lastInvitationToken(dana.email));
    expect(shown.statusCode).toBe(200);
    expect(shown.json()).toMatchObject({
      operator_name: 'acme charging',
      driver_name: 'Dana Driver',
      email: dana.email,
      invited_by: 'olivia',
      is_expired: false,
    });
    expect((await stage.preview('no-such-token')).statusCode).toBe(404);
    const hidden = await stage.driver(stage.technician);
    expect(hidden.json().account).toMatchObject({ status: 'invited', email: null });
  });

  it('is accepted only by a login with the invited address, and links both sides', async () => {
    const token = api.mail.lastInvitationToken(dana.email);
    const someoneElse = await api.issuer.signForDriver({
      keycloakId: 'kc-eve',
      email: 'eve@example.com',
    });
    const wrongPerson = await api.call('POST', `/v1/driver/invitations/${token}/accept`, {
      token: someoneElse,
    });
    const accepted = await stage.answer('accept');

    expect(wrongPerson.statusCode).toBe(403);
    expect(wrongPerson.json().code).toBe('invitation_for_someone_else');
    expect(accepted.statusCode).toBe(200);
    expect(accepted.json().operator).toMatchObject({
      tenant_id: stage.acme,
      operator_name: 'acme charging',
      driver_name: 'Dana Driver',
      reference: 'EMP-42',
      payment_mode: 'inherit',
    });
    expect((await stage.preview(token)).statusCode).toBe(404);
    const seen = await stage.driver();
    expect(seen.json().account).toMatchObject({ status: 'linked', email: dana.email });
    expect(seen.json().account.linked_at).not.toBeNull();
    expect(seen.json().version).toBe(2);
    const operators = await api.call('GET', '/v1/driver/operators', { token: stage.danaToken });
    expect(operators.json().items.map((item: { tenant_id: string }) => item.tenant_id)).toEqual([
      stage.acme,
    ]);
    const profile = await api.call('GET', `/v1/driver/operators/${stage.acme}/profile`, {
      token: stage.danaToken,
    });
    expect(profile.json()).toMatchObject({
      operator_name: 'acme charging',
      email: dana.email,
      groups: [],
      cards: [],
    });
    expect(await stage.auditActions()).toEqual([
      'drivers.invited:user',
      'drivers.invitation_accepted:driver',
    ]);
  });

  it('lets the operator unlink the login, at the version seen', async () => {
    const unlink = (version: number) =>
      api.call('DELETE', `/v1/drivers/${stage.driverId}/account-link`, {
        token: stage.owner,
        version,
      });
    const stale = await unlink(1);
    const unlinked = await unlink(2);
    const again = await unlink(3);

    expect(stale.statusCode).toBe(409);
    expect(unlinked.statusCode).toBe(204);
    expect(again.json().code).toBe('driver_not_linked');
    expect((await stage.driver()).json().account).toMatchObject({ status: 'none', email: null });
    const operators = await api.call('GET', '/v1/driver/operators', { token: stage.danaToken });
    expect(operators.json().items).toEqual([]);
    const gone = await api.call('GET', `/v1/driver/operators/${stage.acme}/profile`, {
      token: stage.danaToken,
    });
    expect(gone.statusCode).toBe(404);
    expect(await stage.auditActions()).toEqual([
      'drivers.invited:user',
      'drivers.invitation_accepted:driver',
      'drivers.unlinked:user',
    ]);
  });
});
