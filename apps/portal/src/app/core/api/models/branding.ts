/** A tenant's brand as drivers see it (the API's PublicBrandingDto). */
export interface PublicBranding {
  name: string;
  logo_url: string | null;
  primary_color: string;
  on_primary_color: string;
  accent_color: string;
  support_email: string | null;
  support_phone: string | null;
  support_url: string | null;
  platform_name: string;
}

/** GET /v1/branding: what the company saved (null where it left the default) and the resulting brand. */
export interface Branding {
  display_name: string | null;
  primary_color: string | null;
  accent_color: string | null;
  support_email: string | null;
  support_phone: string | null;
  support_url: string | null;
  logo_content_type: string | null;
  logo_size_bytes: number | null;
  logo_url: string | null;
  preview: PublicBranding;
  updated_at: string | null;
  /** Sent as If-Match with every change. */
  version: number;
}

/** Body of PATCH /v1/branding: null puts a field back to its default. */
export interface BrandingInput {
  display_name: string | null;
  primary_color: string | null;
  accent_color: string | null;
  support_email: string | null;
  support_phone: string | null;
  support_url: string | null;
}

/** Body of PUT /v1/branding/logo: the image, base64. */
export interface LogoUpload {
  content_type: string;
  data: string;
}
