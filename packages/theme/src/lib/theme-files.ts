import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PlatformColoursSource } from './platform-colours-source';
import { ThemeDefinition } from './theme-definition';
import { TokensCss } from './tokens-css';

/**
 * theme.json and the files generated from it, by their paths from the workspace root.
 * `write` refreshes them; `stale` names the ones that no longer match theme.json.
 */
export class ThemeFiles {
  static readonly THEME = 'packages/theme/theme.json';
  static readonly TOKENS_CSS = 'packages/theme/src/tokens.css';
  static readonly PLATFORM_COLOURS = 'packages/theme/src/platform-colours.ts';

  constructor(private readonly root: string) {}

  theme(): ThemeDefinition {
    return JSON.parse(readFileSync(join(this.root, ThemeFiles.THEME), 'utf8')) as ThemeDefinition;
  }

  /** What each generated file should contain. */
  expected(): Map<string, string> {
    const theme = this.theme();
    return new Map([
      [ThemeFiles.TOKENS_CSS, TokensCss.render(theme)],
      [ThemeFiles.PLATFORM_COLOURS, PlatformColoursSource.render(theme)],
    ]);
  }

  /** The generated files whose content differs from what theme.json gives. */
  stale(): string[] {
    return [...this.expected()]
      .filter(([path, content]) => this.read(path) !== content)
      .map(([path]) => path);
  }

  /** Writes every generated file and returns their paths. */
  write(): string[] {
    const files = this.expected();
    files.forEach((content, path) => writeFileSync(join(this.root, path), content));
    return [...files.keys()];
  }

  private read(path: string): string | null {
    try {
      return readFileSync(join(this.root, path), 'utf8');
    } catch {
      return null;
    }
  }
}
