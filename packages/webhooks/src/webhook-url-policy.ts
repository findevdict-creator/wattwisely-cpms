import { isIP } from 'node:net';

/**
 * Which addresses a webhook endpoint may have (module 16). The worker posts to whatever a
 * tenant types, from inside the platform's network, so an address that points back inside
 * (the database, object storage, the worker's own health page) is refused: only http(s), no
 * loopback, private or link-local IP, and a host with a dot in it. A deployment that tests
 * against a receiver on the same machine switches `isPrivateAllowed` on.
 */
export class WebhookUrlPolicy {
  static readonly MAX_LENGTH = 2000;
  /** Loopback, unspecified, link-local, unique-local and IPv4-mapped addresses. */
  private static readonly PRIVATE_IPV6 = /^(::1|::|fe80:.*|f[cd][0-9a-f]{2}:.*|::ffff:.*)$/i;
  /** [first octet, lowest second octet, highest second octet]: 10/8, 127/8, 0/8, 169.254/16, 172.16/12, 192.168/16, 100.64/10. */
  private static readonly PRIVATE_IPV4: [number, number, number][] = [
    [10, 0, 255],
    [127, 0, 255],
    [0, 0, 255],
    [169, 254, 254],
    [172, 16, 31],
    [192, 168, 168],
    [100, 64, 127],
  ];

  /** Why the address is not acceptable, or null when it is. */
  static problemOf(url: string, isPrivateAllowed = false): string | null {
    if (url.length > WebhookUrlPolicy.MAX_LENGTH) {
      return 'The address is too long.';
    }
    const parsed = WebhookUrlPolicy.parse(url);
    if (!parsed || !WebhookUrlPolicy.isSchemeAllowed(parsed.protocol, isPrivateAllowed)) {
      return 'The address must start with https://.';
    }
    if (parsed.username || parsed.password) {
      return 'The address must not carry a user name or password.';
    }
    if (!isPrivateAllowed && WebhookUrlPolicy.isPrivateHost(parsed.hostname)) {
      return 'The address must be a public one: no private or local network, and a host name with a dot.';
    }
    return null;
  }

  static isPrivateHost(hostname: string): boolean {
    const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
    if (isIP(host)) {
      return WebhookUrlPolicy.isPrivateIp(host);
    }
    return host === 'localhost' || host.endsWith('.localhost') || !host.includes('.');
  }

  /** Always https; plain http only where private addresses are allowed, for a receiver on the developer's machine. */
  private static isSchemeAllowed(protocol: string, isPrivateAllowed: boolean): boolean {
    return protocol === 'https:' || (isPrivateAllowed && protocol === 'http:');
  }

  private static isPrivateIp(ip: string): boolean {
    if (ip.includes(':')) {
      return WebhookUrlPolicy.PRIVATE_IPV6.test(ip);
    }
    const [a, b] = ip.split('.').map(Number);
    return WebhookUrlPolicy.PRIVATE_IPV4.some(
      ([first, from, to]) => a === first && b >= from && b <= to,
    );
  }

  private static parse(url: string): URL | null {
    try {
      return new URL(url);
    } catch {
      return null;
    }
  }
}
