import { TenantBrand } from './tenant-brand';

describe('TenantBrand', () => {
  it('is the tenant’s name in the platform’s colours until something is saved', () => {
    const brand = TenantBrand.defaults('Acme Charging');

    expect(brand).toMatchObject({
      name: 'Acme Charging',
      primaryColor: '#0e7490',
      accentColor: '#0f172a',
      logoUrl: null,
      supportEmail: null,
    });
    expect(brand.onPrimaryColor).toBe('#ffffff');
    expect(brand.hasSupportContact).toBe(false);
  });

  it('takes what is saved and falls back field by field', () => {
    const brand = TenantBrand.of(
      'Acme Charging',
      {
        displayName: 'Acme Go',
        primaryColor: '#fff176',
        accentColor: null,
        supportEmail: 'help@acme.test',
        supportPhone: null,
        supportUrl: null,
        logoEtag: 'abc',
      },
      'http://api.test/v1/public/branding/acme/logo?v=abc',
    );

    expect(brand).toMatchObject({
      name: 'Acme Go',
      primaryColor: '#fff176',
      accentColor: '#0f172a',
      logoUrl: 'http://api.test/v1/public/branding/acme/logo?v=abc',
      supportEmail: 'help@acme.test',
    });
    expect(brand.onPrimaryColor).toBe('#0f172a');
    expect(brand.hasSupportContact).toBe(true);
  });

  it('shows no logo link without a logo, whatever URL it is given', () => {
    const settings = {
      displayName: '',
      primaryColor: null,
      accentColor: null,
      supportEmail: null,
      supportPhone: null,
      supportUrl: null,
      logoEtag: null,
    };
    expect(TenantBrand.of('Acme', settings, 'http://api.test/logo')).toMatchObject({
      name: 'Acme',
      logoUrl: null,
    });
  });
});
