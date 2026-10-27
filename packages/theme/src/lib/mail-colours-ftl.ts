import { ThemeDefinition } from './theme-definition';
import { ThemeTokens } from './theme-tokens';

/**
 * theme-colours.ftl: the theme's hex values for Keycloak's e-mail templates, which cannot use
 * CSS variables. A template imports it (`<#import "theme-colours.ftl" as theme>`) and writes
 * `${theme.ink}`; the names are the palette's, plus the primary and onPrimary roles. (Not
 * `link`: Keycloak hands the e-mail templates a `link` of their own.)
 */
export class MailColoursFtl {
  static readonly HEADER =
    '<#-- Generated from packages/theme/theme.json by `npx nx run theme:generate`. Do not edit. -->';
  static readonly ROLES = ['primary', 'onPrimary'];

  static render(theme: ThemeDefinition): string {
    const tokens = new ThemeTokens(theme);
    const palette = Object.keys(theme.palette).map((name) =>
      MailColoursFtl.assign(name, tokens.hex(name).toLowerCase()),
    );
    const roles = MailColoursFtl.ROLES.map((role) =>
      MailColoursFtl.assign(role, tokens.hex(theme.roles[role]).toLowerCase()),
    );
    return [
      MailColoursFtl.HEADER,
      MailColoursFtl.assign('fontFamily', theme.fontFamily),
      ...palette,
      ...roles,
      '',
    ].join('\n');
  }

  private static assign(name: string, value: string): string {
    return `<#assign ${name} = "${value}">`;
  }
}
