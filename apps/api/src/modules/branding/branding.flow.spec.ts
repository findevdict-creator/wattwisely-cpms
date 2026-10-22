import { TestData, TestDatabase } from '@wattwisely/db/testing';
import { PaymentsFixture } from '../payments/payments.fixture';
import { LogoPolicy } from './logo-policy';

/** A company keeps its name, colours, support contact and logo; brand-on-pages.flow.spec.ts shows them. */
(TestDatabase.isConfigured() ? describe : describe.skip)('Branding', () => {
  const fixture = new PaymentsFixture();
  const { api } = fixture;
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(32, 7)]);
  let version: number;

  beforeAll(async () => {
    await fixture.start();
    await fixture.connectedAccount();
  });
  afterAll(() => fixture.stop());

  const branding = () => api.call('GET', '/v1/branding', fixture.asOwner());
  const change = (body: object, seen: number) =>
    api.call('PATCH', '/v1/branding', { ...fixture.asOwner(body), version: seen });

  it('starts as the company’s name in the platform’s colours, with nothing saved', async () => {
    const answer = await branding();

    expect(answer.statusCode).toBe(200);
    expect(answer.json()).toEqual({
      display_name: null,
      primary_color: null,
      accent_color: null,
      support_email: null,
      support_phone: null,
      support_url: null,
      logo_content_type: null,
      logo_size_bytes: null,
      logo_url: null,
      preview: {
        name: 'acme charging',
        logo_url: null,
        primary_color: '#1b5e20',
        on_primary_color: '#ffffff',
        accent_color: '#43a047',
        support_email: null,
        support_phone: null,
        support_url: null,
        platform_name: 'Wattwisely',
      },
      updated_at: null,
      version: 1,
    });
  });

  it('saves the name, colours and support contact with the version seen, and records it', async () => {
    const saved = await change(
      {
        display_name: 'Acme Go',
        primary_color: 'FFF176',
        support_email: 'help@acme.test',
        support_url: 'https://acme.test/help',
      },
      1,
    );

    expect(saved.statusCode).toBe(200);
    expect(saved.json()).toMatchObject({
      display_name: 'Acme Go',
      primary_color: '#fff176',
      accent_color: null,
      support_email: 'help@acme.test',
      preview: { name: 'Acme Go', primary_color: '#fff176', on_primary_color: '#1b1b1b' },
      version: 2,
    });
    version = saved.json().version;

    const crossed = await change({ display_name: 'Someone else' }, 1);
    expect(crossed.json()).toMatchObject({ status: 409, code: 'version_conflict' });

    const cleared = await change({ display_name: '', support_url: null }, version);
    expect(cleared.json()).toMatchObject({
      display_name: null,
      support_url: null,
      support_email: 'help@acme.test',
      preview: { name: 'acme charging' },
      version: 3,
    });
    version = cleared.json().version;

    const audit = await api.call('GET', '/v1/audit-log?target_type=branding', fixture.asOwner());
    expect(audit.json().items.map((entry: { action: string }) => entry.action)).toEqual([
      'settings.branding_changed',
      'settings.branding_changed',
    ]);
    const recorded = await api.data.sql(
      `select before, after from audit_log where target_type = 'branding' order by occurred_at desc limit 1`,
    );
    expect(recorded.rows[0]).toEqual({
      before: { displayName: 'Acme Go', supportUrl: 'https://acme.test/help' },
      after: { displayName: null, supportUrl: null },
    });
  });

  it('refuses what is not a colour, an e-mail address or a web address', async () => {
    for (const body of [
      { primary_color: 'green' },
      { accent_color: '#12' },
      { support_email: 'not-an-address' },
      { support_url: 'acme.test/help' },
      { support_phone: 'call me' },
    ]) {
      const refused = await change(body, version);
      expect(refused.statusCode).toBe(400);
      expect(refused.json()).toMatchObject({ code: 'validation_failed' });
    }
  });

  it('takes a logo, serves it to anyone by the company’s slug, and drops it again', async () => {
    const upload = await api.call('PUT', '/v1/branding/logo', {
      ...fixture.asOwner({ content_type: 'image/png', data: png.toString('base64') }),
      version,
    });

    expect(upload.statusCode).toBe(200);
    expect(upload.json()).toMatchObject({
      logo_content_type: 'image/png',
      logo_size_bytes: png.length,
      version: version + 1,
    });
    const logoUrl: string = upload.json().logo_url;
    expect(logoUrl).toMatch(
      /^http:\/\/api\.test\/v1\/public\/branding\/acme-charging\/logo\?v=[0-9a-f]{16}$/,
    );
    expect(upload.json().preview.logo_url).toBe(logoUrl);
    version = upload.json().version;

    const served = await api.call('GET', logoUrl.replace('http://api.test', ''));
    expect(served.statusCode).toBe(200);
    expect(served.headers['content-type']).toBe('image/png');
    expect(served.headers['cache-control']).toBe('public, max-age=86400');
    expect(served.headers['content-security-policy']).toContain("default-src 'none'");
    expect(served.rawPayload.equals(png)).toBe(true);
    expect((await api.call('GET', '/v1/public/branding/nobody/logo')).statusCode).toBe(404);

    const removed = await api.call('DELETE', '/v1/branding/logo', {
      ...fixture.asOwner(),
      version,
    });
    expect(removed.json()).toMatchObject({ logo_url: null, logo_content_type: null });
    version = removed.json().version;
    expect((await api.call('GET', logoUrl.replace('http://api.test', ''))).statusCode).toBe(404);
    expect(
      (await api.call('DELETE', '/v1/branding/logo', { ...fixture.asOwner(), version })).statusCode,
    ).toBe(404);
  });

  it('refuses a logo that is too big, renamed, of another type, or an SVG that could run', async () => {
    const upload = (contentType: string, data: Buffer) =>
      api.call('PUT', '/v1/branding/logo', {
        ...fixture.asOwner({ content_type: contentType, data: data.toString('base64') }),
        version,
      });

    expect((await upload('image/gif', png)).json()).toMatchObject({ code: 'validation_failed' });
    expect((await upload('image/png', Buffer.from('GIF89a'))).json()).toMatchObject({
      code: 'logo_not_an_image',
    });
    const huge = Buffer.concat([png, Buffer.alloc(LogoPolicy.MAX_BYTES + 1 - png.length)]);
    expect((await upload('image/png', huge)).json()).toMatchObject({ code: 'logo_too_large' });
    const script = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>');
    expect((await upload('image/svg+xml', script)).json()).toMatchObject({ code: 'logo_unsafe' });
    expect((await branding()).json().version).toBe(version);
  });

  it('lets anyone with settings:read look, and only settings:write change', async () => {
    const reader = await fixture.tokenFor('ron@acme.test', TestData.ROLE_IDS.readOnly);
    const technician = await fixture.tokenFor('ted@acme.test', TestData.ROLE_IDS.technician);

    expect((await api.call('GET', '/v1/branding', { token: reader })).statusCode).toBe(200);
    expect((await api.call('GET', '/v1/branding', { token: technician })).statusCode).toBe(403);
    const refused = await api.call('PATCH', '/v1/branding', {
      token: reader,
      body: { display_name: 'Ron’s' },
      version: 1,
    });
    expect(refused.statusCode).toBe(403);
    expect((await api.call('PATCH', '/v1/branding', fixture.asOwner({}))).statusCode).toBe(428);
    expect((await api.call('GET', '/v1/branding')).statusCode).toBe(401);
  });
});
