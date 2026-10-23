import { LogoPolicy } from './logo-policy';

describe('LogoPolicy', () => {
  const png = Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(16)]);
  const svg = (body: string) =>
    Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">${body}</svg>`);

  it('accepts the four image types when the bytes match', () => {
    expect(() => LogoPolicy.check('image/png', png)).not.toThrow();
    expect(() => LogoPolicy.check('image/jpeg', Buffer.from('ffd8ffe000', 'hex'))).not.toThrow();
    expect(() =>
      LogoPolicy.check('image/webp', Buffer.from('RIFF\0\0\0\0WEBPVP8 ', 'latin1')),
    ).not.toThrow();
    expect(() =>
      LogoPolicy.check('image/svg+xml', svg('<rect width="1" height="1"/>')),
    ).not.toThrow();
  });

  it('refuses other types, renamed files, empty and oversized logos', () => {
    expect(() => LogoPolicy.check('image/gif', png)).toThrow(
      expect.objectContaining({ code: 'logo_type_not_allowed' }),
    );
    expect(() => LogoPolicy.check('image/png', Buffer.from('not a png'))).toThrow(
      expect.objectContaining({ code: 'logo_not_an_image' }),
    );
    expect(() => LogoPolicy.check('image/png', Buffer.alloc(0))).toThrow(
      expect.objectContaining({ code: 'logo_too_large' }),
    );
    const huge = Buffer.concat([png, Buffer.alloc(LogoPolicy.MAX_BYTES)]);
    expect(() => LogoPolicy.check('image/png', huge)).toThrow(
      expect.objectContaining({ code: 'logo_too_large' }),
    );
  });

  it('refuses an SVG with anything that could run', () => {
    for (const body of [
      '<script>alert(1)</script>',
      '<a onclick="x()">',
      '<a href="javascript:x()">',
      '<foreignObject></foreignObject>',
    ]) {
      expect(() => LogoPolicy.check('image/svg+xml', svg(body))).toThrow(
        expect.objectContaining({ code: 'logo_unsafe' }),
      );
    }
    expect(LogoPolicy.isSafeSvg('<svg><text>online</text></svg>')).toBe(true);
  });

  it('fingerprints the bytes', () => {
    expect(LogoPolicy.etagOf(png)).toMatch(/^[0-9a-f]{16}$/);
    expect(LogoPolicy.etagOf(png)).toBe(LogoPolicy.etagOf(Buffer.from(png)));
    expect(LogoPolicy.etagOf(png)).not.toBe(LogoPolicy.etagOf(Buffer.from('ffd8ff', 'hex')));
  });
});
