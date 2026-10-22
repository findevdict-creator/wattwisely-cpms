import { BrandColour } from './brand-colour';

/** The saved settings a brand is built from (the tenant_branding row without the logo's bytes). */
export interface BrandSettings {
  displayName: string | null;
  primaryColor: string | null;
  accentColor: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  supportUrl: string | null;
  logoEtag: string | null;
}

/** Everything a brand shows: the fields of TenantBrand. */
export interface TenantBrandView {
  name: string;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  supportEmail: string | null;
  supportPhone: string | null;
  supportUrl: string | null;
}

/**
 * How one tenant looks to drivers (white-labelling design, "Branded" level): the name on
 * the page, the colours of the top bar and the buttons, the logo and the support contact.
 * Every tenant has a brand: without settings it is the tenant's name in the platform's colours.
 */
export class TenantBrand implements TenantBrandView {
  static readonly PLATFORM_NAME = 'Wattwisely';
  static readonly DEFAULT_PRIMARY = '#1b5e20';
  static readonly DEFAULT_ACCENT = '#43a047';
  static readonly NO_SETTINGS: BrandSettings = {
    displayName: null,
    primaryColor: null,
    accentColor: null,
    supportEmail: null,
    supportPhone: null,
    supportUrl: null,
    logoEtag: null,
  };

  readonly name: string;
  readonly primaryColor: string;
  readonly accentColor: string;
  readonly logoUrl: string | null;
  readonly supportEmail: string | null;
  readonly supportPhone: string | null;
  readonly supportUrl: string | null;

  constructor(view: TenantBrandView) {
    this.name = view.name;
    this.primaryColor = view.primaryColor;
    this.accentColor = view.accentColor;
    this.logoUrl = view.logoUrl;
    this.supportEmail = view.supportEmail;
    this.supportPhone = view.supportPhone;
    this.supportUrl = view.supportUrl;
  }

  /** The tenant's name in the platform's colours: what a tenant that never saved anything gets. */
  static defaults(tenantName: string): TenantBrand {
    return TenantBrand.of(tenantName, null, null);
  }

  /** The brand from what is saved; `logoUrl` is where the API serves the logo, if there is one. */
  static of(tenantName: string, settings: BrandSettings | null, logoUrl: string | null) {
    const saved = settings ?? TenantBrand.NO_SETTINGS;
    return new TenantBrand({
      name: saved.displayName || tenantName,
      primaryColor: saved.primaryColor ?? TenantBrand.DEFAULT_PRIMARY,
      accentColor: saved.accentColor ?? TenantBrand.DEFAULT_ACCENT,
      logoUrl: saved.logoEtag ? logoUrl : null,
      supportEmail: saved.supportEmail,
      supportPhone: saved.supportPhone,
      supportUrl: saved.supportUrl,
    });
  }

  /** The text colour that reads on the primary colour. */
  get onPrimaryColor(): string {
    return BrandColour.textOn(this.primaryColor);
  }

  get hasSupportContact(): boolean {
    return Boolean(this.supportEmail || this.supportPhone || this.supportUrl);
  }
}
