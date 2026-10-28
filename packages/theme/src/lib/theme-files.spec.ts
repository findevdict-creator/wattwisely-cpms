import { join } from 'node:path';
import { BrandMark } from './brand-mark';
import { ThemeFiles } from './theme-files';

describe('ThemeFiles', () => {
  const files = new ThemeFiles(join(__dirname, '../../../..'));

  it('has generated files that match theme.json (run `npx nx run theme:generate`)', () => {
    expect(files.stale()).toEqual([]);
  });

  it('gives the default brand white text on the brand teal, as approved', () => {
    const source = files.expected().get(ThemeFiles.PLATFORM_COLOURS) ?? '';
    expect(source).toContain("static readonly PRIMARY = '#0e7490';");
    expect(source).toContain("static readonly ON_PRIMARY = '#ffffff';");
  });

  it('gives Keycloak the same tokens as the apps', () => {
    const expected = files.expected();
    expect(expected.get(ThemeFiles.KEYCLOAK_TOKENS_CSS)).toBe(expected.get(ThemeFiles.TOKENS_CSS));
  });

  it('keeps the charger states that mean ready in green, apart from the teal brand', () => {
    const tokens = files.expected().get(ThemeFiles.TOKENS_CSS) ?? '';
    expect(tokens).toContain('--ww-status-available-background: var(--ww-success-soft);');
    expect(tokens).toContain('--ww-status-charging-dot: var(--ww-success);');
    expect(tokens).toContain('--ww-success: #16a34a;');
  });

  it('draws the logo in its own teal, and the e-mail header in the brand teal with white on it', () => {
    const mark = files.expected().get(ThemeFiles.KEYCLOAK_MARK) ?? '';
    expect(mark).toContain(`d="${BrandMark.RING}" fill="none" stroke="#0e7490"`);
    const logo = files.expected().get(ThemeFiles.KEYCLOAK_LOGO) ?? '';
    expect(logo).toContain(`<path d="${BrandMark.NAME}" fill="#0e7490"/>`);
    const mail = files.expected().get(ThemeFiles.KEYCLOAK_MAIL_COLOURS) ?? '';
    expect(mail).toContain('<#assign primary = "#0e7490">');
    expect(mail).toContain('<#assign onPrimary = "#ffffff">');
    expect(mail).toContain('<#assign fontFamily = "Inter">');
  });
});
