/**
 * Arithmetic on #rrggbb colors: the shade and tint Ionic expects beside each color, its
 * r, g, b triple, and which of two text colors reads better on it (WCAG contrast ratio).
 */
export class ColourMix {
  static readonly BLACK = '#000000';
  static readonly WHITE = '#ffffff';
  /** Ionic's own generator darkens by 12% for the shade and lightens by 10% for the tint. */
  static readonly SHADE = 0.12;
  static readonly TINT = 0.1;

  static rgb(hex: string): [number, number, number] {
    const value = parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  static rgbList(hex: string): string {
    return ColourMix.rgb(hex).join(', ');
  }

  static shade(hex: string): string {
    return ColourMix.mix(hex, ColourMix.BLACK, ColourMix.SHADE);
  }

  static tint(hex: string): string {
    return ColourMix.mix(hex, ColourMix.WHITE, ColourMix.TINT);
  }

  /** `weight` of `other` mixed into `hex`, as #rrggbb in lower case. */
  static mix(hex: string, other: string, weight: number): string {
    const [base, add] = [ColourMix.rgb(hex), ColourMix.rgb(other)];
    const parts = base.map((part, i) => Math.round(part * (1 - weight) + add[i] * weight));
    return `#${parts.map((part) => part.toString(16).padStart(2, '0')).join('')}`;
  }

  /** The one of `light` and `dark` with the higher contrast ratio on `background`. */
  static readableOn(background: string, light: string, dark: string): string {
    return ColourMix.contrast(background, light) >= ColourMix.contrast(background, dark)
      ? light
      : dark;
  }

  static contrast(first: string, second: string): number {
    const [lighter, darker] = [ColourMix.luminance(first), ColourMix.luminance(second)].sort(
      (a, b) => b - a,
    );
    return (lighter + 0.05) / (darker + 0.05);
  }

  private static luminance(hex: string): number {
    const [r, g, b] = ColourMix.rgb(hex).map((part) => {
      const channel = part / 255;
      return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
}
