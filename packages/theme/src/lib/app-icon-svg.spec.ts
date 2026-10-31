import { join } from 'node:path';
import { AndroidIconXml } from './android-icon-xml';
import { AppIconSvg } from './app-icon-svg';
import { BrandMark } from './brand-mark';
import { ThemeFiles } from './theme-files';

describe('AppIconSvg and AndroidIconXml', () => {
  const theme = new ThemeFiles(join(__dirname, '../../../..')).theme();

  it('draws the icon as the white mark on the logo teal, at the size asked for', () => {
    const icon = AppIconSvg.renderIcon(theme, false, 1024);
    expect(icon).toContain('width="1024" height="1024" viewBox="0 0 108 108"');
    expect(icon).toContain('<rect width="108" height="108" fill="#0e7490"/>');
    expect(icon).toContain(`<path d="${BrandMark.RING}" fill="none" stroke="#ffffff"`);
    expect(AppIconSvg.renderIcon(theme, true, 48)).toContain('<circle cx="54" cy="54" r="54"');
  });

  it('draws the splash as the teal mark on white, with the ring in the middle', () => {
    const splash = AppIconSvg.renderSplash(theme, 2732);
    expect(splash).toContain('<rect width="360" height="360" fill="#ffffff"/>');
    expect(splash).toContain('translate(180 180) scale(1) translate(-32 -32)');
    expect(splash).toContain('stroke="#0e7490"');
  });

  it("centres Android's vector mark in the 108 dp icon box, in white for the launcher", () => {
    const foreground = AndroidIconXml.renderForeground();
    expect(foreground).toContain('android:translateX="22" android:translateY="22"');
    expect(foreground).toContain(`android:pathData="${BrandMark.W}" android:strokeColor="#FFFFFF"`);
    expect(AndroidIconXml.renderSplashMark(theme)).toContain('android:strokeColor="#0E7490"');
    const colours = AndroidIconXml.renderColours(theme);
    expect(colours).toContain('<color name="ic_launcher_background">#0E7490</color>');
  });
});
