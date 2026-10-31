import { PublicBranding } from '@wattwisely/driver-core';

/** How to reach the operator about a charge: its words and the link that opens the phone's app. */
export interface Contact {
  text: string;
  href: string;
}

/**
 * "Contact Acme Charging · +44 20 7946 0000" under a receipt (Figma 11, "Session detail"):
 * the operator's support phone, else its e-mail, else its help page, as its branding gives them.
 */
export class SupportContact {
  static of(branding: PublicBranding | null): Contact | null {
    if (!branding) {
      return null;
    }
    const prefix = `Contact ${branding.name}`;
    if (branding.support_phone) {
      const number = branding.support_phone.replace(/[^\d+]/g, '');
      return { text: `${prefix} · ${branding.support_phone}`, href: `tel:${number}` };
    }
    if (branding.support_email) {
      return {
        text: `${prefix} · ${branding.support_email}`,
        href: `mailto:${branding.support_email}`,
      };
    }
    if (branding.support_url) {
      return {
        text: `${prefix} · ${new URL(branding.support_url).host}`,
        href: branding.support_url,
      };
    }
    return null;
  }
}
