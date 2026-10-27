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
});
