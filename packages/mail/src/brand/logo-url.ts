/**
 * Where a tenant's logo is served: a public address on the API, keyed by the tenant's slug,
 * with the logo's fingerprint as a cache key so a new logo gets a new address.
 */
export class LogoUrl {
  static of(apiUrl: string, slug: string, etag: string): string {
    const base = apiUrl.replace(/\/+$/, '');
    return `${base}/v1/public/branding/${encodeURIComponent(slug)}/logo?v=${etag}`;
  }
}
