import { ColourMix } from './colour-mix';

describe('ColourMix', () => {
  it('reads a color as its r, g, b triple', () => {
    expect(ColourMix.rgb('#0e7490')).toEqual([14, 116, 144]);
    expect(ColourMix.rgbList('#ffffff')).toBe('255, 255, 255');
  });

  it("darkens by 12% and lightens by 10%, as Ionic's color generator does", () => {
    expect(ColourMix.shade('#ffffff')).toBe('#e0e0e0');
    expect(ColourMix.tint('#000000')).toBe('#1a1a1a');
  });

  it('picks the text color that reads better', () => {
    expect(ColourMix.readableOn('#0e7490', '#ffffff', '#0f172a')).toBe('#ffffff');
    expect(ColourMix.readableOn('#f1f5f9', '#ffffff', '#0f172a')).toBe('#0f172a');
    expect(ColourMix.contrast('#ffffff', '#000000')).toBeCloseTo(21);
  });
});
