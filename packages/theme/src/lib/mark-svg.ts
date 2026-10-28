import { BrandMark } from './brand-mark';
import { ThemeDefinition } from './theme-definition';
import { ThemeTokens } from './theme-tokens';

/**
 * The logo's SVG files: the mark alone, the tab icon of the apps (favicon.svg) and of Keycloak's
 * sign-in pages (mark.svg), and the lockup of the mark and the name over Keycloak's card
 * (logo.svg). They are drawn in theme.json's `logo` color from BrandMark's paths.
 */
export class MarkSvg {
  static readonly HEADER =
    '<!-- Generated from packages/theme/theme.json by `npx nx run theme:generate`. Do not edit. -->';

  static render(theme: ThemeDefinition): string {
    return MarkSvg.svg(BrandMark.MARK_VIEW_BOX, MarkSvg.mark(MarkSvg.colour(theme)));
  }

  static renderLockup(theme: ThemeDefinition): string {
    const colour = MarkSvg.colour(theme);
    return MarkSvg.svg(BrandMark.LOCKUP_VIEW_BOX, [
      `  <g transform="${BrandMark.LOCKUP_MARK_TRANSFORM}">`,
      ...MarkSvg.mark(colour).map((line) => `  ${line}`),
      '  </g>',
      `  <path d="${BrandMark.NAME}" fill="${colour}"/>`,
    ]);
  }

  private static mark(colour: string): string[] {
    const stroke = `fill="none" stroke="${colour}" stroke-width="${BrandMark.STROKE_WIDTH}"`;
    return [
      `  <path d="${BrandMark.RING}" ${stroke}/>`,
      `  <path d="${BrandMark.W}" ${stroke} stroke-linejoin="miter" stroke-miterlimit="6"/>`,
    ];
  }

  private static svg(viewBox: string, body: string[]): string {
    return [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" role="img" aria-label="Wattwisely">`,
      `  ${MarkSvg.HEADER}`,
      ...body,
      '</svg>',
      '',
    ].join('\n');
  }

  private static colour(theme: ThemeDefinition): string {
    return new ThemeTokens(theme).hex('logo').toLowerCase();
  }
}
