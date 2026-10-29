/** A plug as its QR code names it: the charger's identity and the plug's number on it. */
export interface PlugRef {
  identity: string;
  connector: string;
}

/**
 * Reads the plug out of what the scanner or the driver gives (module 32): the QR code's
 * address, https://charge.example.com/c/WW-7KQ4M2XR9T/1, or the code typed by hand as
 * "WW-7KQ4M2XR9T/1" or "WW-7KQ4M2XR9T 1". Anything else is not a plug.
 */
export class PlugCode {
  static readonly PATH = /\/c\/([^/?#]+)\/(\d+)\/?(?:[?#].*)?$/;
  static readonly TYPED = /^([A-Za-z0-9._:-]+)[\s/]+(\d+)$/;

  static parse(text: string): PlugRef | null {
    const trimmed = text.trim();
    const match = PlugCode.PATH.exec(trimmed) ?? PlugCode.TYPED.exec(trimmed);
    if (!match) {
      return null;
    }
    try {
      return { identity: decodeURIComponent(match[1]), connector: String(Number(match[2])) };
    } catch {
      return null;
    }
  }

  /** The app's own page for the plug. */
  static route(plug: PlugRef): string[] {
    return ['/plug', plug.identity, plug.connector];
  }
}
