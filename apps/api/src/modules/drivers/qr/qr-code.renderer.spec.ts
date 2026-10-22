import { QrCodeRenderer } from './qr-code.renderer';

describe('QrCodeRenderer', () => {
  it('draws an SVG that scales', async () => {
    const svg = await new QrCodeRenderer().svg('https://charge.example.com/c/WW-7KQ4M2XR9T/1');

    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"/);
    expect(svg).toContain('viewBox="0 0 ');
    expect(svg).toContain('<path');
  });
});
