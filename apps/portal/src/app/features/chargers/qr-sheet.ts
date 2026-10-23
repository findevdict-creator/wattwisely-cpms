import { ConnectorQrCode } from '../../core/api/models/charger';

/** What goes on the sheet besides the codes. */
export interface QrSheetHeading {
  chargerIdentity: string;
  siteName: string;
}

/**
 * A printable page of a charger's QR codes: one sticker per plug, the plug's name above
 * the code and the address under it, so a sticker still works when the code is damaged.
 * Plain HTML in a new tab, which the browser prints; no portal styling leaks in.
 */
export class QrSheet {
  static readonly STYLE = `
    body { font-family: Roboto, Helvetica, Arial, sans-serif; margin: 24px; color: #111; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    p.where { margin: 0 0 24px; color: #555; }
    .stickers { display: flex; flex-wrap: wrap; gap: 24px; }
    .sticker { width: 260px; padding: 16px; border: 1px dashed #999; border-radius: 12px;
      text-align: center; page-break-inside: avoid; }
    .sticker h2 { font-size: 22px; margin: 0 0 8px; }
    .sticker svg { width: 200px; height: 200px; }
    .sticker .scan { font-size: 16px; font-weight: bold; margin: 8px 0 4px; }
    .sticker .url { font-size: 11px; word-break: break-all; color: #333; }
  `;

  static html(heading: QrSheetHeading, codes: ConnectorQrCode[]): string {
    const title = `QR codes for ${QrSheet.escape(heading.chargerIdentity)}`;
    return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><title>${title}</title><style>${QrSheet.STYLE}</style></head>
<body onload="window.print()">
<h1>${title}</h1>
<p class="where">${QrSheet.escape(heading.siteName)}</p>
<div class="stickers">${codes.map((code) => QrSheet.sticker(code)).join('')}</div>
</body>
</html>`;
  }

  private static sticker(code: ConnectorQrCode): string {
    return `<div class="sticker">
<h2>Plug ${QrSheet.escape(code.label)}</h2>
${code.svg}
<div class="scan">Scan to charge</div>
<div class="url">${QrSheet.escape(code.url)}</div>
</div>`;
  }

  /** The SVG comes from the API as is; everything else is text and is escaped. */
  static escape(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}
