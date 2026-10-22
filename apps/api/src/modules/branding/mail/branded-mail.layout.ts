import { MailMessage } from '../../../common/mail/mail-message';
import { TenantBrand } from '../tenant-brand';

/** What an e-mail says; the layout adds the brand around it. */
export interface MailContent {
  subject: string;
  headline: string;
  paragraphs: string[];
  action?: { label: string; url: string };
  /** Small print under the paragraphs, e.g. how long a link works. */
  footnote?: string;
}

/**
 * Every e-mail the platform sends on a tenant's behalf, in the tenant's brand: a bar in
 * the primary colour with the logo and the name, the message, a button, the support
 * contact, and the "Powered by Wattwisely" line (white-labelling design, "Branded" level).
 * Words from people are escaped; links are the platform's own.
 */
export class BrandedMailLayout {
  static readonly POWERED_BY = `Powered by ${TenantBrand.PLATFORM_NAME}`;

  static render(brand: TenantBrand, content: MailContent): Omit<MailMessage, 'to'> {
    return {
      subject: content.subject,
      fromName: brand.name,
      text: BrandedMailLayout.text(brand, content),
      html: BrandedMailLayout.html(brand, content),
    };
  }

  static text(brand: TenantBrand, content: MailContent): string {
    const parts = [content.headline, '', ...content.paragraphs];
    if (content.action) {
      parts.push('', `${content.action.label}: ${content.action.url}`);
    }
    if (content.footnote) {
      parts.push('', content.footnote);
    }
    parts.push('', '--', brand.name, ...BrandedMailLayout.supportLines(brand));
    parts.push(BrandedMailLayout.POWERED_BY);
    return parts.join('\n');
  }

  static html(brand: TenantBrand, content: MailContent): string {
    const escape = BrandedMailLayout.escape;
    const body = [
      `<h1 style="margin:0 0 16px;font-size:20px;font-weight:600">${escape(content.headline)}</h1>`,
      ...content.paragraphs.map((text) => `<p style="margin:0 0 12px">${escape(text)}</p>`),
      content.action ? BrandedMailLayout.button(brand, content.action) : '',
      content.footnote
        ? `<p style="margin:16px 0 0;font-size:13px;color:#5f6368">${escape(content.footnote)}</p>`
        : '',
    ].join('');
    return [
      `<div style="margin:0;padding:24px 12px;background:#f3f4f6;font-family:Roboto,'Helvetica Neue',Arial,sans-serif;color:#1b1b1b;font-size:15px;line-height:1.5">`,
      `<table role="presentation" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;width:100%;background:#ffffff;border-radius:12px;overflow:hidden">`,
      `<tr><td style="background:${brand.primaryColor};color:${brand.onPrimaryColor};padding:16px 24px;font-size:18px;font-weight:500">${BrandedMailLayout.header(brand)}</td></tr>`,
      `<tr><td style="padding:24px">${body}</td></tr>`,
      `<tr><td style="padding:16px 24px;border-top:1px solid #e5e7eb;font-size:13px;color:#5f6368">${BrandedMailLayout.footer(brand)}</td></tr>`,
      `</table></div>`,
    ].join('');
  }

  private static header(brand: TenantBrand): string {
    const name = BrandedMailLayout.escape(brand.name);
    const logo = brand.logoUrl
      ? `<img src="${BrandedMailLayout.escape(brand.logoUrl)}" alt="" height="32" style="height:32px;max-width:160px;vertical-align:middle;margin-right:10px">`
      : '';
    return `${logo}<span style="vertical-align:middle">${name}</span>`;
  }

  private static button(brand: TenantBrand, action: { label: string; url: string }): string {
    return `<p style="margin:20px 0"><a href="${BrandedMailLayout.escape(action.url)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:${brand.primaryColor};color:${brand.onPrimaryColor};text-decoration:none;font-weight:500">${BrandedMailLayout.escape(action.label)}</a></p>`;
  }

  private static footer(brand: TenantBrand): string {
    const lines = [brand.name, ...BrandedMailLayout.supportLines(brand)].map(
      BrandedMailLayout.escape,
    );
    return `${lines.join('<br>')}<br><span style="color:#9aa0a6">${BrandedMailLayout.POWERED_BY}</span>`;
  }

  /** "Questions? …" lines for the support contact the tenant gave, if any. */
  static supportLines(brand: TenantBrand): string[] {
    return [
      brand.supportEmail ? `Support: ${brand.supportEmail}` : '',
      brand.supportPhone ? `Phone: ${brand.supportPhone}` : '',
      brand.supportUrl ? `Help: ${brand.supportUrl}` : '',
    ].filter((line) => line);
  }

  static escape(text: string): string {
    return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
  }
}
