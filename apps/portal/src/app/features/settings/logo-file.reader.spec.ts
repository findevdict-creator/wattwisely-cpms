import { LogoFileReader } from './logo-file.reader';

describe('LogoFileReader', () => {
  it('encodes an image file the way the API wants it', async () => {
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'logo.png', {
      type: 'image/png',
    });

    await expect(LogoFileReader.read(file)).resolves.toEqual({
      content_type: 'image/png',
      data: 'iVBORw==',
    });
  });

  it('refuses other types and files that are too big or empty', async () => {
    const gif = new File([new Uint8Array(4)], 'logo.gif', { type: 'image/gif' });
    await expect(LogoFileReader.read(gif)).rejects.toThrow('PNG, JPEG, SVG or WebP');

    const empty = new File([], 'logo.png', { type: 'image/png' });
    await expect(LogoFileReader.read(empty)).rejects.toThrow('at most 512 KB');

    const huge = new File([new Uint8Array(LogoFileReader.MAX_BYTES + 1)], 'logo.png', {
      type: 'image/png',
    });
    await expect(LogoFileReader.read(huge)).rejects.toThrow('at most 512 KB');
  });
});
