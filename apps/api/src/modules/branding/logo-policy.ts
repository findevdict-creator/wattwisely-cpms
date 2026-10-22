import { createHash } from 'node:crypto';
import { BrandingErrors } from './branding-errors';

/**
 * What a logo may be: one of four image types, at most 512 KB, and an SVG with nothing
 * that could run (the API serves the bytes as they are). The bytes must look like the
 * type they claim, so a renamed file is refused before it is stored.
 */
export class LogoPolicy {
  static readonly MAX_BYTES = 512 * 1024;
  static readonly CONTENT_TYPES = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
  static readonly ETAG_LENGTH = 16;
  /** Anything that makes an SVG more than a picture. */
  static readonly UNSAFE_SVG = [
    /<script/i,
    /<foreignobject/i,
    /<iframe/i,
    /<embed/i,
    /<object/i,
    /\son[a-z]+\s*=/i,
    /javascript:/i,
    /<!entity/i,
  ];

  /** Throws the matching problem when the logo is not acceptable. */
  static check(contentType: string, data: Buffer): void {
    if (!LogoPolicy.CONTENT_TYPES.includes(contentType)) {
      throw BrandingErrors.logoTypeNotAllowed();
    }
    if (data.length === 0 || data.length > LogoPolicy.MAX_BYTES) {
      throw BrandingErrors.logoTooLarge();
    }
    if (!LogoPolicy.looksLike(contentType, data)) {
      throw BrandingErrors.logoNotAnImage();
    }
    if (contentType === 'image/svg+xml' && !LogoPolicy.isSafeSvg(data.toString('utf8'))) {
      throw BrandingErrors.logoUnsafe();
    }
  }

  /** Do the first bytes match the claimed type? */
  static looksLike(contentType: string, data: Buffer): boolean {
    switch (contentType) {
      case 'image/png':
        return data.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'));
      case 'image/jpeg':
        return data.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'));
      case 'image/webp':
        return (
          data.subarray(0, 4).toString('latin1') === 'RIFF' &&
          data.subarray(8, 12).toString('latin1') === 'WEBP'
        );
      case 'image/svg+xml':
        return /<svg[\s>]/i.test(data.subarray(0, 4096).toString('utf8'));
      default:
        return false;
    }
  }

  static isSafeSvg(text: string): boolean {
    return !LogoPolicy.UNSAFE_SVG.some((pattern) => pattern.test(text));
  }

  /** A short fingerprint of the bytes, for the cache key in the logo's URL. */
  static etagOf(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex').slice(0, LogoPolicy.ETAG_LENGTH);
  }
}
