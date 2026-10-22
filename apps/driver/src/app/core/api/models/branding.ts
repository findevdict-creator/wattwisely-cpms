/** How the operator wants the page to look, as every public answer carries it. */
export interface PublicBranding {
  /** The name drivers see for the operator. */
  name: string;
  logo_url: string | null;
  /** #rrggbb: the top bar and the buttons. */
  primary_color: string;
  /** #rrggbb: text that reads on the primary colour. */
  on_primary_color: string;
  /** #rrggbb: highlights and links. */
  accent_color: string;
  support_email: string | null;
  support_phone: string | null;
  support_url: string | null;
  /** For the "Powered by" line. */
  platform_name: string;
}
