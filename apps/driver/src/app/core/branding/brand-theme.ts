import { PlatformColours } from '@wattwisely/theme';
import { PublicBranding } from '../api/models/branding';

/**
 * Turns an operator's brand into the page's colours: the Material tokens the buttons,
 * spinners and fields read, and the app's own variables for the bar and the links.
 * The platform's own brand (theme.json) is what the app starts with and goes back to. The
 * accent becomes Material's secondary color; tertiary stays the theme's blue for information.
 */
export class BrandTheme {
  static readonly PLATFORM: PublicBranding = {
    name: 'Wattwisely',
    logo_url: null,
    primary_color: PlatformColours.PRIMARY,
    on_primary_color: PlatformColours.ON_PRIMARY,
    accent_color: PlatformColours.ACCENT,
    support_email: null,
    support_phone: null,
    support_url: null,
    platform_name: 'Wattwisely',
  };

  /** How much white goes into the light tint used behind the primary colour. */
  static readonly CONTAINER_TINT = 0.86;

  /** The CSS variables for a brand, set on the page's root element. */
  static cssVariables(brand: PublicBranding): Record<string, string> {
    const container = BrandTheme.tint(brand.primary_color, BrandTheme.CONTAINER_TINT);
    return {
      '--mat-sys-primary': brand.primary_color,
      '--mat-sys-on-primary': brand.on_primary_color,
      '--mat-sys-primary-container': container,
      '--mat-sys-on-primary-container': PlatformColours.INK,
      '--mat-sys-secondary': brand.accent_color,
      '--ww-accent': brand.accent_color,
    };
  }

  /** The colour moved towards white: 0 leaves it, 1 makes it white. */
  static tint(hex: string, amount: number): string {
    const digits = hex.replace('#', '').padEnd(6, '0');
    const channels = [0, 2, 4].map((start) => {
      const value = parseInt(digits.slice(start, start + 2), 16) || 0;
      return Math.round(value + (255 - value) * amount);
    });
    return `#${channels.map((value) => value.toString(16).padStart(2, '0')).join('')}`;
  }

  /** "Charge · Acme Go", or just "Charge" for the platform itself. */
  static title(brand: PublicBranding): string {
    return brand.name === BrandTheme.PLATFORM.name ? 'Charge' : `Charge · ${brand.name}`;
  }
}
