import { TenantBrand } from '../brand/tenant-brand';
import { BrandedMailLayout } from './branded-mail.layout';

describe('BrandedMailLayout', () => {
  const brand = new TenantBrand({
    name: 'Acme <Go>',
    primaryColor: '#123456',
    accentColor: '#43a047',
    logoUrl: 'http://api.test/v1/public/branding/acme/logo?v=abc',
    supportEmail: 'help@acme.test',
    supportPhone: null,
    supportUrl: 'https://acme.test/help',
  });
  const content = {
    subject: 'Join Acme',
    headline: 'Olivia invited you',
    paragraphs: ['You are invited as Technician & more.'],
    action: { label: 'Accept', url: 'http://portal.test/invitations/t0k' },
    footnote: 'The link works until Friday.',
  };

  it('wraps the message in the brand: colour, logo, name, support and the platform line', () => {
    const mail = BrandedMailLayout.render(brand, content);

    expect(mail.subject).toBe('Join Acme');
    expect(mail.fromName).toBe('Acme <Go>');
    expect(mail.html).toContain('background:#123456;color:#ffffff');
    expect(mail.html).toContain('src="http://api.test/v1/public/branding/acme/logo?v=abc"');
    expect(mail.html).toContain('Acme &#60;Go&#62;');
    expect(mail.html).toContain('href="http://portal.test/invitations/t0k"');
    expect(mail.html).toContain('Technician &#38; more');
    expect(mail.html).toContain('Support: help@acme.test<br>Help: https://acme.test/help');
    expect(mail.html).toContain('Powered by Wattwisely');
    expect(mail.html).not.toContain('<Go>');
  });

  it('says the same in plain text', () => {
    const text = BrandedMailLayout.text(brand, content);

    expect(text).toBe(
      [
        'Olivia invited you',
        '',
        'You are invited as Technician & more.',
        '',
        'Accept: http://portal.test/invitations/t0k',
        '',
        'The link works until Friday.',
        '',
        '--',
        'Acme <Go>',
        'Support: help@acme.test',
        'Help: https://acme.test/help',
        'Powered by Wattwisely',
      ].join('\n'),
    );
  });

  it('leaves out what a brand does not have', () => {
    const plain = TenantBrand.defaults('Volt Hotels');
    const html = BrandedMailLayout.html(plain, {
      ...content,
      action: undefined,
      footnote: undefined,
    });

    expect(html).not.toContain('<img');
    expect(html).not.toContain('Support:');
    expect(html).toContain('background:#1b5e20');
    expect(BrandedMailLayout.supportLines(plain)).toEqual([]);
  });
});
