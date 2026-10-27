import { ThemeDefinition } from './theme-definition';
import { ThemeTokens } from './theme-tokens';

/**
 * platform-colours.ts: the theme's hex values as constants, for code that cannot read CSS
 * variables (e-mails, Stripe's card form, print pages) and for the default brand. Hex is in
 * lower case, the way the API stores a brand color.
 */
export class PlatformColoursSource {
  static readonly HEADER =
    '// Generated from packages/theme/theme.json by `npx nx run theme:generate`. Do not edit.';

  static render(theme: ThemeDefinition): string {
    const tokens = new ThemeTokens(theme);
    const palette = Object.keys(theme.palette).map((name) =>
      PlatformColoursSource.colour(PlatformColoursSource.upperSnake(name), tokens.hex(name)),
    );
    return [
      PlatformColoursSource.HEADER,
      '',
      '/** The theme as hex values, for code that cannot read the CSS variables. */',
      'export class PlatformColours {',
      PlatformColoursSource.constant('FONT_FAMILY', theme.fontFamily),
      ...palette,
      '  /** The brand of a tenant that chose no colors: primary, the text on it, the accent. */',
      PlatformColoursSource.colour('PRIMARY', tokens.hex(theme.roles['primary'])),
      PlatformColoursSource.colour('ON_PRIMARY', tokens.hex(theme.roles['onPrimary'])),
      PlatformColoursSource.colour('ACCENT', tokens.hex(theme.roles['secondary'])),
      '}',
      '',
    ].join('\n');
  }

  private static constant(name: string, value: string): string {
    return `  static readonly ${name} = '${value}';`;
  }

  private static colour(name: string, hex: string): string {
    return PlatformColoursSource.constant(name, hex.toLowerCase());
  }

  /** "brandDark" as "BRAND_DARK". */
  private static upperSnake(name: string): string {
    return ThemeTokens.kebab(name).replace(/-/g, '_').toUpperCase();
  }
}
