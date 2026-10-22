import { LogoUpload } from '../../core/api/models/branding';

/**
 * Turns the file someone picked into the API's upload body, after the same first checks
 * the API makes (type and size), so most mistakes are caught before anything is sent.
 */
export class LogoFileReader {
  static readonly MAX_BYTES = 512 * 1024;
  static readonly TYPES: Record<string, string> = {
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/svg+xml': 'SVG',
    'image/webp': 'WebP',
  };

  /** Rejects with a sentence for people when the file cannot be a logo. */
  static async read(file: File): Promise<LogoUpload> {
    if (!LogoFileReader.TYPES[file.type]) {
      throw new Error('Choose a PNG, JPEG, SVG or WebP image.');
    }
    if (file.size === 0 || file.size > LogoFileReader.MAX_BYTES) {
      throw new Error(`The logo must be at most ${LogoFileReader.MAX_BYTES / 1024} KB.`);
    }
    const bytes = await LogoFileReader.bytesOf(file);
    return { content_type: file.type, data: LogoFileReader.base64(bytes) };
  }

  private static bytesOf(file: File): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(new Uint8Array(reader.result as ArrayBuffer));
      reader.onerror = () => reject(new Error('The file could not be read.'));
      reader.readAsArrayBuffer(file);
    });
  }

  private static base64(bytes: Uint8Array): string {
    let binary = '';
    const chunk = 0x8000;
    for (let start = 0; start < bytes.length; start += chunk) {
      binary += String.fromCharCode(...bytes.subarray(start, start + chunk));
    }
    return btoa(binary);
  }
}
