import { TenantSlug } from './tenant-slug';

describe('TenantSlug', () => {
  it('derives a short name from a company name', () => {
    expect(TenantSlug.fromName('Acme Charging GmbH')).toBe('acme-charging-gmbh');
    expect(TenantSlug.fromName('  Électro Mobilité & Co. ')).toBe('electro-mobilite-co');
    expect(TenantSlug.fromName('X')).toBe('tenant-x');
  });

  it('keeps the short name within 40 characters without a dangling dash', () => {
    const slug = TenantSlug.fromName('A very long company name that goes on and on forever');

    expect(slug.length).toBeLessThanOrEqual(40);
    expect(slug.endsWith('-')).toBe(false);
    expect(TenantSlug.isValid(slug)).toBe(true);
  });

  it('accepts only lower-case letters, digits and single dashes', () => {
    expect(TenantSlug.isValid('acme-charging')).toBe(true);
    expect(TenantSlug.isValid('a')).toBe(false);
    expect(TenantSlug.isValid('Acme')).toBe(false);
    expect(TenantSlug.isValid('acme--charging')).toBe(false);
    expect(TenantSlug.isValid('-acme')).toBe(false);
  });
});
