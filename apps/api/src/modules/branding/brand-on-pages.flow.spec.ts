import { TestData, TestDatabase } from '@wattwisely/db/testing';
import { PaymentsFixture } from '../payments/payments.fixture';

/** What a company saved dresses the driver's pages and its e-mails; another company sees nothing of it. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Brand on the pages', () => {
  const fixture = new PaymentsFixture();
  const { api } = fixture;
  let logoUrl: string;

  beforeAll(async () => {
    await fixture.start();
    await fixture.connectedAccount();
    const saved = await api.call('PATCH', '/v1/branding', {
      ...fixture.asOwner({
        display_name: 'Acme Go',
        primary_color: 'FFF176',
        accent_color: '#ff6f00',
        support_email: 'help@acme.test',
      }),
      version: 1,
    });
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><text>Acme</text></svg>');
    const upload = await api.call('PUT', '/v1/branding/logo', {
      ...fixture.asOwner({ content_type: 'image/svg+xml', data: svg.toString('base64') }),
      version: saved.json().version,
    });
    logoUrl = upload.json().logo_url;
  });
  afterAll(() => fixture.stop());

  it('shows the brand on the plug and the charge, and nothing of another company', async () => {
    const place = await api.call('GET', '/v1/public/places/cp-pay-1/1');
    expect(place.json()).toMatchObject({
      operator_name: 'acme charging',
      branding: {
        name: 'Acme Go',
        primary_color: '#fff176',
        on_primary_color: '#1b1b1b',
        accent_color: '#ff6f00',
        logo_url: logoUrl,
        support_email: 'help@acme.test',
      },
    });

    const charge = await fixture.startCharge(2);
    expect(charge.json().branding).toMatchObject({ name: 'Acme Go', primary_color: '#fff176' });
    const followed = await api.call('GET', `/v1/public/charges/${charge.json().charge_key}`);
    expect(followed.json().branding).toMatchObject({
      name: 'Acme Go',
      platform_name: 'Wattwisely',
    });

    const volt = await api.data.tenant('volt-hotels');
    const mia = await api.data.person('mia@volt.test');
    await api.data.member(volt, mia, TestData.ROLE_IDS.owner);
    const theirs = await api.call('GET', '/v1/branding', { token: await api.issuer.signFor(mia) });
    expect(theirs.json()).toMatchObject({ display_name: null, preview: { name: 'volt hotels' } });
  });

  it('dresses the invitation e-mail in the brand', async () => {
    const owner = TestData.ROLE_IDS.owner;
    const invited = await api.call('POST', '/v1/members/invites', {
      ...fixture.asOwner({ email: 'nina@acme.test', roles: [{ role_id: owner }] }),
    });
    expect(invited.json()).toMatchObject({ is_email_sent: true });

    const mail = api.mail.sent.at(-1);
    expect(mail).toMatchObject({
      to: 'nina@acme.test',
      subject: 'Join Acme Go',
      fromName: 'Acme Go',
    });
    expect(mail?.html).toContain('background:#fff176;color:#1b1b1b');
    expect(mail?.html).toContain(logoUrl);
    expect(mail?.html).toContain('Powered by Wattwisely');
    expect(mail?.text).toContain('Support: help@acme.test');
    expect(api.mail.lastInvitationToken('nina@acme.test')).toMatch(/\w/);
  });
});
