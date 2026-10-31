import { ColourMix } from './colour-mix';
import { ThemeDefinition } from './theme-definition';
import { ThemeTokens } from './theme-tokens';

/**
 * ionic.css: theme.json in Ionic's variables, for the mobile app (module 30). Ionic wants each
 * named color with its r, g, b triple, a text color, a shade and a tint, so they are worked
 * out here from the palette rather than written by hand.
 */
export class IonicColoursCss {
  static readonly HEADER =
    '/* Generated from packages/theme/theme.json by `npx nx run theme:generate`. Do not edit. */';
  /** Ionic's color names and the palette colors behind them. */
  static readonly COLOURS: Readonly<Record<string, string>> = {
    primary: 'brand',
    success: 'success',
    warning: 'warning',
    danger: 'danger',
    dark: 'ink',
    medium: 'text2',
    light: 'surface',
  };
  /** Page, text and bar colors: Ionic's global variables and the palette colors behind them. */
  static readonly GLOBALS: Readonly<Record<string, string>> = {
    'background-color': 'background',
    'text-color': 'ink',
    'border-color': 'line',
    'item-background': 'white',
    'card-background': 'white',
    'toolbar-background': 'background',
    'toolbar-color': 'ink',
    'tab-bar-background': 'white',
    'tab-bar-border-color': 'line',
    'tab-bar-color': 'muted',
    'tab-bar-color-selected': 'brand',
  };

  private readonly tokens: ThemeTokens;

  constructor(private readonly theme: ThemeDefinition) {
    this.tokens = new ThemeTokens(theme);
  }

  static render(theme: ThemeDefinition): string {
    return new IonicColoursCss(theme).lines().join('\n');
  }

  lines(): string[] {
    return [
      IonicColoursCss.HEADER,
      ':root {',
      '  --ion-font-family: var(--ww-font);',
      ...this.globalLines(),
      ...Object.entries(IonicColoursCss.COLOURS).flatMap(([name, colour]) =>
        this.colourLines(name, colour),
      ),
      '}',
      '',
    ];
  }

  private globalLines(): string[] {
    const lines = Object.entries(IonicColoursCss.GLOBALS).map(
      ([name, colour]) => `  --ion-${name}: ${this.hex(colour)};`,
    );
    return [
      ...lines,
      `  --ion-background-color-rgb: ${ColourMix.rgbList(this.hex('background'))};`,
      `  --ion-text-color-rgb: ${ColourMix.rgbList(this.hex('ink'))};`,
    ];
  }

  private colourLines(name: string, colour: string): string[] {
    const hex = this.hex(colour);
    const contrast = ColourMix.readableOn(hex, this.hex('white'), this.hex('ink'));
    const prefix = `  --ion-color-${name}`;
    return [
      `${prefix}: ${hex};`,
      `${prefix}-rgb: ${ColourMix.rgbList(hex)};`,
      `${prefix}-contrast: ${contrast};`,
      `${prefix}-contrast-rgb: ${ColourMix.rgbList(contrast)};`,
      `${prefix}-shade: ${ColourMix.shade(hex)};`,
      `${prefix}-tint: ${ColourMix.tint(hex)};`,
    ];
  }

  private hex(colour: string): string {
    return this.tokens.hex(colour).toLowerCase();
  }
}
