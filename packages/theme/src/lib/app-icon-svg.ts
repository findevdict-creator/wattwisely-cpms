import { BrandMark } from './brand-mark';
import { ThemeDefinition } from './theme-definition';
import { ThemeTokens } from './theme-tokens';

/**
 * The mobile app's icon and splash screen as SVG, from BrandMark's paths, for AppIconPngs to turn
 * into the PNGs the iOS project and older Android phones need. The icon is the mark in white on
 * the logo's teal, as the driver web app's home-screen icon is; the splash is the mark in teal on
 * white, small in the middle of a square that an iPhone crops to its screen.
 */
export class AppIconSvg {
  /** The icon's box; the mark's ring (54 units across in BrandMark) fills 60% of it. */
  static readonly ICON_SIZE = 108;
  static readonly ICON_SCALE = 1.2;
  /** The splash's box; the ring fills 15% of it, about 130 points on a phone. */
  static readonly SPLASH_SIZE = 360;

  /** The icon, `pixels` square. */
  static renderIcon(theme: ThemeDefinition, isRound: boolean, pixels: number): string {
    const size = AppIconSvg.ICON_SIZE;
    const half = size / 2;
    const background = isRound
      ? `<circle cx="${half}" cy="${half}" r="${half}" fill="${AppIconSvg.logo(theme)}"/>`
      : `<rect width="${size}" height="${size}" fill="${AppIconSvg.logo(theme)}"/>`;
    const mark = AppIconSvg.mark('#ffffff', AppIconSvg.ICON_SCALE, half);
    return AppIconSvg.svg([size, pixels], background, mark);
  }

  /** The splash, `pixels` square. */
  static renderSplash(theme: ThemeDefinition, pixels: number): string {
    const size = AppIconSvg.SPLASH_SIZE;
    const background = `<rect width="${size}" height="${size}" fill="#ffffff"/>`;
    const mark = AppIconSvg.mark(AppIconSvg.logo(theme), 1, size / 2);
    return AppIconSvg.svg([size, pixels], background, mark);
  }

  /** The mark at `scale`, its ring centred on (`centre`, `centre`), drawn in `colour`. */
  private static mark(colour: string, scale: number, centre: number): string {
    const stroke = `fill="none" stroke="${colour}" stroke-width="${BrandMark.STROKE_WIDTH}"`;
    return [
      `<g transform="translate(${centre} ${centre}) scale(${scale}) translate(-${BrandMark.RING_CENTRE} -${BrandMark.RING_CENTRE})">`,
      `<path d="${BrandMark.RING}" ${stroke}/>`,
      `<path d="${BrandMark.W}" ${stroke} stroke-linejoin="miter" stroke-miterlimit="6"/>`,
      '</g>',
    ].join('');
  }

  /** An SVG `pixels` square, drawn on a `box`-unit square. */
  private static svg([box, pixels]: [number, number], background: string, mark: string): string {
    const size = `width="${pixels}" height="${pixels}" viewBox="0 0 ${box} ${box}"`;
    return `<svg xmlns="http://www.w3.org/2000/svg" ${size}>${background}${mark}</svg>`;
  }

  private static logo(theme: ThemeDefinition): string {
    return new ThemeTokens(theme).hex('logo').toLowerCase();
  }
}
