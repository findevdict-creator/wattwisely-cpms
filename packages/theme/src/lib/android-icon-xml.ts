import { BrandMark } from './brand-mark';
import { ThemeDefinition } from './theme-definition';
import { ThemeTokens } from './theme-tokens';

/**
 * The Android project's icon and splash resources that follow theme.json: the mark as vector
 * drawables, which Android 8 and later draw sharp at any size, and the colors behind them. The
 * launcher icon is the white mark on the logo's teal; the splash is the teal mark on white. Both
 * drawables use Android's 108 dp icon box with the ring 54 dp across in its middle, inside the
 * 66 dp a launcher's mask never cuts and the 72 dp a splash screen shows.
 */
export class AndroidIconXml {
  static readonly HEADER =
    '<!-- Generated from packages/theme/theme.json by `npx nx run theme:generate`. Do not edit. -->';
  static readonly BOX = 108;

  static renderForeground(): string {
    return AndroidIconXml.vector('#FFFFFF');
  }

  static renderSplashMark(theme: ThemeDefinition): string {
    return AndroidIconXml.vector(AndroidIconXml.logo(theme));
  }

  static renderColours(theme: ThemeDefinition): string {
    return [
      '<?xml version="1.0" encoding="utf-8"?>',
      AndroidIconXml.HEADER,
      '<resources>',
      `    <color name="ic_launcher_background">${AndroidIconXml.logo(theme)}</color>`,
      '    <color name="splash_background">#FFFFFF</color>',
      '</resources>',
      '',
    ].join('\n');
  }

  private static vector(colour: string): string {
    const box = AndroidIconXml.BOX;
    const offset = box / 2 - BrandMark.RING_CENTRE;
    const stroke = `android:strokeColor="${colour}" android:strokeWidth="${BrandMark.STROKE_WIDTH}"`;
    return [
      '<?xml version="1.0" encoding="utf-8"?>',
      AndroidIconXml.HEADER,
      '<vector xmlns:android="http://schemas.android.com/apk/res/android"',
      `    android:width="${box}dp" android:height="${box}dp"`,
      `    android:viewportWidth="${box}" android:viewportHeight="${box}">`,
      `    <group android:translateX="${offset}" android:translateY="${offset}">`,
      `        <path android:pathData="${BrandMark.RING}" ${stroke}/>`,
      `        <path android:pathData="${BrandMark.W}" ${stroke}`,
      '            android:strokeLineJoin="miter" android:strokeMiterLimit="6"/>',
      '    </group>',
      '</vector>',
      '',
    ].join('\n');
  }

  private static logo(theme: ThemeDefinition): string {
    return new ThemeTokens(theme).hex('logo').toUpperCase();
  }
}
