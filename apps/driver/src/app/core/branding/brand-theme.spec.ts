import { BrandTheme } from './brand-theme';

describe('BrandTheme', () => {
  it('maps a brand onto the colour tokens the page reads', () => {
    const variables = BrandTheme.cssVariables({
      ...BrandTheme.PLATFORM,
      name: 'Acme Go',
      primary_color: '#102030',
      on_primary_color: '#ffffff',
      accent_color: '#ff6f00',
    });

    expect(variables).toEqual({
      '--mat-sys-primary': '#102030',
      '--mat-sys-on-primary': '#ffffff',
      '--mat-sys-primary-container': '#dee0e2',
      '--mat-sys-on-primary-container': '#0f172a',
      '--mat-sys-secondary': '#ff6f00',
      '--ww-accent': '#ff6f00',
    });
  });

  it('tints towards white and names the page after the operator', () => {
    expect(BrandTheme.tint('#000000', 0.5)).toBe('#808080');
    expect(BrandTheme.tint('#ffffff', 0.86)).toBe('#ffffff');
    expect(BrandTheme.tint('#16a34a', 0)).toBe('#16a34a');
    expect(BrandTheme.title(BrandTheme.PLATFORM)).toBe('Charge');
    expect(BrandTheme.title({ ...BrandTheme.PLATFORM, name: 'Acme Go' })).toBe('Charge · Acme Go');
  });
});
