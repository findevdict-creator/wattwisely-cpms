import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { AppIconPngs } from './app-icon-pngs';
import { ThemeFiles } from './theme-files';

describe('AppIconPngs', () => {
  const theme = new ThemeFiles(join(__dirname, '../../../..')).theme();
  const pngs = new AppIconPngs('');

  it('draws the iOS icon, its launch images and the older Android launcher icons', () => {
    const paths = [...pngs.images(theme).keys()];
    expect(paths).toContain(AppIconPngs.IOS_ICON);
    expect(paths).toEqual(expect.arrayContaining(AppIconPngs.IOS_SPLASHES));
    expect(paths).toContain(`${ThemeFiles.ANDROID_RES}/mipmap-xxxhdpi/ic_launcher_round.png`);
    expect(paths).toHaveLength(1 + 3 + 2 * AppIconPngs.ANDROID_SIZES.length);
  });

  it('writes the iOS icon at 1024 pixels without transparency, which the App Store refuses', async () => {
    const root = mkdtempSync(join(tmpdir(), 'app-icons-'));
    try {
      await new AppIconPngs(root).write(theme);
      const icon = await sharp(join(root, AppIconPngs.IOS_ICON)).metadata();
      expect([icon.width, icon.height, icon.hasAlpha]).toEqual([1024, 1024, false]);
      const round = `${ThemeFiles.ANDROID_RES}/mipmap-mdpi/ic_launcher_round.png`;
      const roundIcon = await sharp(join(root, round)).metadata();
      expect([roundIcon.width, roundIcon.hasAlpha]).toEqual([48, true]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
