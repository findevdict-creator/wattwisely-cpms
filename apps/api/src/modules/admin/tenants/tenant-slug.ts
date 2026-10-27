/**
 * A tenant's short name (story ADM-01): what goes into URLs and, later, subdomains.
 * Lower-case letters, digits and single dashes, 2 to 40 characters, derived from the
 * company name unless staff choose one. Unique forever: a deleted tenant keeps its slug.
 */
export class TenantSlug {
  static readonly PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,38}[a-z0-9])?$/;
  static readonly MAX_LENGTH = 40;

  static isValid(slug: string): boolean {
    return slug.length >= 2 && TenantSlug.PATTERN.test(slug) && !slug.includes('--');
  }

  /** "Acme Charging GmbH" becomes "acme-charging-gmbh"; accents are dropped. */
  static fromName(name: string): string {
    const slug = name
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, TenantSlug.MAX_LENGTH)
      .replace(/-+$/g, '');
    return slug.length >= 2 ? slug : `tenant-${slug}`.slice(0, TenantSlug.MAX_LENGTH);
  }
}
