/** Colour sums for the live preview: the same rule the API applies when it answers. */
export class BrandColour {
  static readonly PATTERN = /^#?([0-9a-fA-F]{6})$/;

  /** "#1B5E20" or "1b5e20" as "#1b5e20"; null for anything else. */
  static normalise(text: string): string | null {
    const match = BrandColour.PATTERN.exec(text.trim());
    return match ? `#${match[1].toLowerCase()}` : null;
  }

  /** White on dark colours, near-black on light ones (WCAG 2 contrast). */
  static textOn(hex: string): string {
    const luminance = BrandColour.luminance(hex);
    return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / 0.05 ? '#ffffff' : '#1b1b1b';
  }

  private static luminance(hex: string): number {
    const digits = BrandColour.normalise(hex)?.slice(1) ?? '000000';
    const [red, green, blue] = [0, 2, 4].map((start) => {
      const channel = parseInt(digits.slice(start, start + 2), 16) / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
  }
}
