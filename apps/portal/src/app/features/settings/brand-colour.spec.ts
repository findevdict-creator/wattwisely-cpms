import { BrandColour } from './brand-colour';

describe('BrandColour', () => {
  it('measures contrast the WCAG way', () => {
    expect(BrandColour.contrast('#ffffff', '#000000')).toBeCloseTo(21, 0);
    expect(BrandColour.contrast('#16a34a', '#ffffff')).toBeCloseTo(3.3, 1);
  });

  it('warns only when small text would be too faint', () => {
    expect(BrandColour.contrastNote('#16a34a', '#ffffff')).toContain(
      'White text on this colour is 3.3 to 1',
    );
    expect(BrandColour.contrastNote('#0f172a', '#ffffff')).toBe('');
  });
});
