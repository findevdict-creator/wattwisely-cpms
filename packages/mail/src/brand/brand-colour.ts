import { PlatformColours } from '@wattwisely/theme';

/**
 * A brand colour as "#rrggbb" and the text colour that reads on it. Colours arrive from
 * the portal's colour picker; drivers' pages paint buttons and the top bar with them.
 */
export class BrandColour {
  static readonly PATTERN = /^#?([0-9a-f]{6})$/i;
  static readonly LIGHT_TEXT = PlatformColours.WHITE;
  static readonly DARK_TEXT = PlatformColours.INK;

  /** "#1B5E20" or "1b5e20" as "#1b5e20"; null for anything that is not six hex digits. */
  static normalise(text: string): string | null {
    const match = BrandColour.PATTERN.exec(text.trim());
    return match ? `#${match[1].toLowerCase()}` : null;
  }

  static isValid(text: string): boolean {
    return BrandColour.normalise(text) !== null;
  }

  /**
   * The text on a brand's primary colour: white on the platform's own teal, as theme.json
   * says, and otherwise whichever of white and ink contrasts more with the colour.
   */
  static onPrimary(hex: string): string {
    return BrandColour.normalise(hex) === PlatformColours.PRIMARY
      ? PlatformColours.ON_PRIMARY
      : BrandColour.textOn(hex);
  }

  /** White on dark colours, near-black on light ones: whichever contrasts more (WCAG 2). */
  static textOn(hex: string): string {
    const luminance = BrandColour.luminance(hex);
    const withLight = 1.05 / (luminance + 0.05);
    const withDark = (luminance + 0.05) / 0.05;
    return withLight >= withDark ? BrandColour.LIGHT_TEXT : BrandColour.DARK_TEXT;
  }

  /** Relative luminance, 0 for black and 1 for white (WCAG 2, sRGB). */
  static luminance(hex: string): number {
    const [red, green, blue] = BrandColour.channels(hex).map((value) => {
      const channel = value / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }

  private static channels(hex: string): [number, number, number] {
    const digits = BrandColour.normalise(hex)?.slice(1) ?? '000000';
    return [0, 2, 4].map((start) => parseInt(digits.slice(start, start + 2), 16)) as [
      number,
      number,
      number,
    ];
  }
}
