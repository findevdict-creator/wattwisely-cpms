import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AppIcons } from './app-icons';

/** Every <mat-icon> in the Angular apps, with the icon names it can show. */
class IconUsage {
  static readonly APPS = ['portal', 'admin', 'driver'];
  static readonly TAG = /<mat-icon\b[^>]*>/g;
  static readonly NAME = /svgIcon="([a-z0-9-]+)"|'([a-z0-9-]+)'/g;

  constructor(private readonly root: string) {}

  tags(): { file: string; tag: string }[] {
    return IconUsage.APPS.flatMap((app) => this.files(join(this.root, 'apps', app, 'src'))).flatMap(
      (file) =>
        [...readFileSync(file, 'utf8').matchAll(IconUsage.TAG)].map(([tag]) => ({ file, tag })),
    );
  }

  static names(tag: string): string[] {
    return [...tag.matchAll(IconUsage.NAME)].map((match) => match[1] ?? match[2]);
  }

  private files(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) {
        return this.files(path);
      }
      return /\.(html|ts)$/.test(entry.name) && !entry.name.endsWith('.spec.ts') ? [path] : [];
    });
  }
}

describe('icons in the apps', () => {
  const tags = new IconUsage(join(__dirname, '../../../../..')).tags();

  it('finds the icons', () => {
    expect(tags.length).toBeGreaterThan(100);
  });

  it('draws every icon from Lucide, never from the Material icon font', () => {
    const ligatures = tags.filter(({ tag }) => !/svgIcon/.test(tag));
    expect(ligatures).toEqual([]);
  });

  it('names only icons that AppIcons registers', () => {
    const unknown = tags.flatMap(({ file, tag }) =>
      IconUsage.names(tag)
        .filter((name) => !(name in AppIcons.SVG))
        .map((name) => `${file}: ${name}`),
    );
    expect(unknown).toEqual([]);
  });
});
