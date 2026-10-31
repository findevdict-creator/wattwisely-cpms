import { ThemeDefinition } from './theme-definition';
import { ThemeTokens } from './theme-tokens';

describe('ThemeTokens', () => {
  const theme: ThemeDefinition = {
    name: 'Test',
    version: 1,
    fontFamily: 'Inter',
    palette: { ink: '#0F172A', brandDark: '#15803D' },
    roles: { onSurface: 'ink', link: 'brandDark', primary: '#16A34A' },
    status: { inUse: { background: 'ink', text: '#FFFFFF', dot: 'brandDark' } },
  };
  const properties = new Map(new ThemeTokens(theme).properties());

  it('names palette colors in kebab case', () => {
    expect(properties.get('--ww-brand-dark')).toBe('#15803D');
  });

  it('points Material roles at the palette, so a palette change reaches them', () => {
    expect(properties.get('--mat-sys-on-surface')).toBe('var(--ww-ink)');
  });

  it("keeps the platform's own roles out of Material's names", () => {
    expect(properties.get('--ww-link')).toBe('var(--ww-brand-dark)');
    expect(properties.has('--mat-sys-link')).toBe(false);
  });

  it('takes a hex value where a role gives one', () => {
    expect(properties.get('--mat-sys-primary')).toBe('#16A34A');
  });

  it('gives each status chip its background, text and dot', () => {
    expect(properties.get('--ww-status-in-use-background')).toBe('var(--ww-ink)');
    expect(properties.get('--ww-status-in-use-text')).toBe('#FFFFFF');
    expect(properties.get('--ww-status-in-use-dot')).toBe('var(--ww-brand-dark)');
  });

  it('refuses a name that is not in the palette', () => {
    const broken = { ...theme, roles: { primary: 'brand' } };
    expect(() => new ThemeTokens(broken).properties()).toThrow('"brand"');
  });
});
