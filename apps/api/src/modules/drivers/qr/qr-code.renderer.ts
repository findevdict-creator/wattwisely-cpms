import { toString as renderQrCode } from 'qrcode';

/**
 * Draws a QR code as SVG, so the portal can show it on screen and print it on a sticker at
 * any size. Error correction M: a quarter of the code may be scuffed and it still scans.
 */
export class QrCodeRenderer {
  static readonly OPTIONS = { type: 'svg', errorCorrectionLevel: 'M', margin: 2 } as const;

  svg(text: string): Promise<string> {
    return renderQrCode(text, QrCodeRenderer.OPTIONS);
  }
}
