import { ThemeDefinition } from './theme-definition';
import { ThemeTokens } from './theme-tokens';

/**
 * mark.svg: the logo mark, a zap on a rounded square in the primary color, as the approved
 * screens draw it next to the name. Keycloak's pages show it above the card and in the tab.
 */
export class MarkSvg {
  static readonly HEADER =
    '<!-- Generated from packages/theme/theme.json by `npx nx run theme:generate`. Do not edit. -->';
  /** Lucide's "zap" (lucide-static 1.55), the icon the apps use for the brand. */
  static readonly ZAP =
    'M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z';

  static render(theme: ThemeDefinition): string {
    const tokens = new ThemeTokens(theme);
    const primary = tokens.hex(theme.roles['primary']).toLowerCase();
    const onPrimary = tokens.hex(theme.roles['onPrimary']).toLowerCase();
    // The icon is 20px of the 32px square, with the apps' 1.75 stroke.
    return [
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">',
      `  ${MarkSvg.HEADER}`,
      `  <rect width="32" height="32" rx="8" fill="${primary}"/>`,
      `  <path d="${MarkSvg.ZAP}" transform="translate(6 6) scale(0.8333)" fill="none" stroke="${onPrimary}" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`,
      '</svg>',
      '',
    ].join('\n');
  }
}
