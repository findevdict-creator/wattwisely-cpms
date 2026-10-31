import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import sharp from 'sharp';
import { AppIconSvg } from './app-icon-svg';
import { ThemeDefinition } from './theme-definition';
import { ThemeFiles } from './theme-files';

/**
 * The mobile app's icons and splash screen as PNG, drawn from AppIconSvg: the iOS icon (one
 * 1024-pixel image, which Xcode scales), the iOS launch image, and the launcher icons of Android 7,
 * which predates the vector icons in AndroidIconXml. The iOS icon has no transparency, which the
 * App Store refuses. Written by `npx nx run theme:icons` after a change to the logo or its color.
 */
export class AppIconPngs {
  static readonly IOS_ASSETS = 'apps/mobile/ios/App/App/Assets.xcassets';
  static readonly IOS_ICON = `${AppIconPngs.IOS_ASSETS}/AppIcon.appiconset/AppIcon-512@2x.png`;
  /** Capacitor's launch image set: the same 2732-pixel square at 1x, 2x and 3x. */
  static readonly IOS_SPLASHES = ['', '-1', '-2'].map(
    (suffix) => `${AppIconPngs.IOS_ASSETS}/Splash.imageset/splash-2732x2732${suffix}.png`,
  );
  /** Android's launcher icon sizes in pixels, by screen density. */
  static readonly ANDROID_SIZES: ReadonlyArray<readonly [string, number]> = [
    ['mdpi', 48],
    ['hdpi', 72],
    ['xhdpi', 96],
    ['xxhdpi', 144],
    ['xxxhdpi', 192],
  ];

  constructor(private readonly root: string) {}

  /** Every PNG by its path from the workspace root, with the SVG it is drawn from. */
  images(theme: ThemeDefinition): Map<string, string> {
    const splash = AppIconSvg.renderSplash(theme, 2732);
    const images = new Map([[AppIconPngs.IOS_ICON, AppIconSvg.renderIcon(theme, false, 1024)]]);
    AppIconPngs.IOS_SPLASHES.forEach((path) => images.set(path, splash));
    for (const [density, pixels] of AppIconPngs.ANDROID_SIZES) {
      const folder = `${ThemeFiles.ANDROID_RES}/mipmap-${density}`;
      images.set(`${folder}/ic_launcher.png`, AppIconSvg.renderIcon(theme, false, pixels));
      images.set(`${folder}/ic_launcher_round.png`, AppIconSvg.renderIcon(theme, true, pixels));
    }
    return images;
  }

  /** Writes every PNG and returns their paths. */
  async write(theme: ThemeDefinition): Promise<string[]> {
    const images = this.images(theme);
    for (const [path, svg] of images) {
      await this.render(path, svg);
    }
    return [...images.keys()];
  }

  /** A round icon keeps its transparent corners; every other image is opaque. */
  private async render(path: string, svg: string): Promise<void> {
    const target = join(this.root, path);
    mkdirSync(dirname(target), { recursive: true });
    const image = sharp(Buffer.from(svg));
    const isRound = svg.includes('<circle');
    await (isRound ? image : image.removeAlpha()).png({ compressionLevel: 9 }).toFile(target);
  }
}
