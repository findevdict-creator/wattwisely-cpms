import { ThemeDefinition } from './theme-definition';
import { ThemeTokens } from './theme-tokens';

/** tokens.css: every custom property of the theme on `:root`, for the apps and Keycloak. */
export class TokensCss {
  static readonly HEADER =
    '/* Generated from packages/theme/theme.json by `npx nx run theme:generate`. Do not edit. */';

  static render(theme: ThemeDefinition): string {
    const lines = new ThemeTokens(theme)
      .properties()
      .map(([name, value]) => `  ${name}: ${TokensCss.lowerHex(value)};`);
    return [TokensCss.HEADER, ':root {', ...lines, '}', ''].join('\n');
  }

  /** Hex colors in lower case, the way Prettier writes CSS. */
  private static lowerHex(value: string): string {
    return value.startsWith('#') ? value.toLowerCase() : value;
  }
}
