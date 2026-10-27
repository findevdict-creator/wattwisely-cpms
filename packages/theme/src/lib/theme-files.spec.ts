import { join } from 'node:path';
import { ThemeFiles } from './theme-files';

describe('ThemeFiles', () => {
  const files = new ThemeFiles(join(__dirname, '../../../..'));

  it('has generated files that match theme.json (run `npx nx run theme:generate`)', () => {
    expect(files.stale()).toEqual([]);
  });

  it('gives the default brand white text on the brand green, as approved', () => {
    const source = files.expected().get(ThemeFiles.PLATFORM_COLOURS) ?? '';
    expect(source).toContain("static readonly PRIMARY = '#16a34a';");
    expect(source).toContain("static readonly ON_PRIMARY = '#ffffff';");
  });

  it('gives Keycloak the same tokens as the apps', () => {
    const expected = files.expected();
    expect(expected.get(ThemeFiles.KEYCLOAK_TOKENS_CSS)).toBe(expected.get(ThemeFiles.TOKENS_CSS));
  });

  it('draws the mark and the e-mail header in the brand green with white on it', () => {
    const mark = files.expected().get(ThemeFiles.KEYCLOAK_MARK) ?? '';
    expect(mark).toContain('fill="#16a34a"');
    expect(mark).toContain('stroke="#ffffff"');
    const mail = files.expected().get(ThemeFiles.KEYCLOAK_MAIL_COLOURS) ?? '';
    expect(mail).toContain('<#assign primary = "#16a34a">');
    expect(mail).toContain('<#assign onPrimary = "#ffffff">');
    expect(mail).toContain('<#assign fontFamily = "Inter">');
  });
});
