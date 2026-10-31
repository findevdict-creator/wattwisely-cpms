import { BrandColour } from './brand-colour';

describe('BrandColour', () => {
  it('accepts six hex digits with or without the hash, in any case', () => {
    expect(BrandColour.normalise('#1B5E20')).toBe('#1b5e20');
    expect(BrandColour.normalise(' ff6600 ')).toBe('#ff6600');
    expect(BrandColour.isValid('#abc')).toBe(false);
    expect(BrandColour.isValid('#12345g')).toBe(false);
    expect(BrandColour.isValid('rgb(1,2,3)')).toBe(false);
  });

  it('puts white text on dark colours and dark text on light ones', () => {
    expect(BrandColour.textOn('#1b5e20')).toBe('#ffffff');
    expect(BrandColour.textOn('#000000')).toBe('#ffffff');
    expect(BrandColour.textOn('#ffffff')).toBe('#0f172a');
    expect(BrandColour.textOn('#ffeb3b')).toBe('#0f172a');
    expect(BrandColour.textOn('#1976d2')).toBe('#ffffff');
    expect(BrandColour.textOn('#16a34a')).toBe('#0f172a');
  });

  it('puts white text on the platform teal, as theme.json says', () => {
    expect(BrandColour.onPrimary('#0E7490')).toBe('#ffffff');
    expect(BrandColour.onPrimary('#fff176')).toBe('#0f172a');
  });

  it('measures luminance the WCAG way', () => {
    expect(BrandColour.luminance('#000000')).toBe(0);
    expect(BrandColour.luminance('#ffffff')).toBeCloseTo(1, 5);
    expect(BrandColour.luminance('#808080')).toBeCloseTo(0.2159, 3);
  });
});
