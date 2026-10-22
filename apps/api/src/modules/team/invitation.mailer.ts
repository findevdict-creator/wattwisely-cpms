import { Injectable, Logger } from '@nestjs/common';
import { ApiConfig } from '../../config/api.config';
import { MailSender } from '../../common/mail/mail.sender';
import { BrandedMailLayout } from '../branding/mail/branded-mail.layout';
import { TenantBrand } from '../branding/tenant-brand';
import { TenantBrandLookup } from '../branding/tenant-brand.lookup';

/** What goes into an invitation e-mail. */
export interface InvitationEmail {
  to: string;
  tenantId: string;
  inviterName: string;
  roleNames: string[];
  token: string;
  expiresAt: Date;
}

/**
 * Writes and sends the invitation e-mail (story ACC-02) in the company's brand (module 8).
 * The link opens the portal's invitation page.
 */
@Injectable()
export class InvitationMailer {
  private readonly logger = new Logger(InvitationMailer.name);

  constructor(
    private readonly config: ApiConfig,
    private readonly mailSender: MailSender,
    private readonly brands: TenantBrandLookup,
  ) {}

  /** Returns false instead of failing when the e-mail server refuses: the invitation is saved and can be resent. */
  async send(email: InvitationEmail): Promise<boolean> {
    const brand = await this.brands.load(email.tenantId);
    const link = `${this.config.portalUrl.replace(/\/$/, '')}/invitations/${email.token}`;
    const roles = email.roleNames.join(', ');
    const message = BrandedMailLayout.render(brand, {
      subject: `Join ${brand.name}`,
      headline: `${email.inviterName} invited you to join ${brand.name}`,
      paragraphs: [
        `You are invited as ${roles}. Accept the invitation to set up your login and start working in the ${TenantBrand.PLATFORM_NAME} portal.`,
      ],
      action: { label: 'Accept the invitation', url: link },
      footnote: `The link works until ${email.expiresAt.toUTCString()}.`,
    });
    try {
      await this.mailSender.send({ to: email.to, ...message });
      return true;
    } catch (error) {
      this.logger.error(`Invitation e-mail to ${email.to} failed: ${(error as Error).message}`);
      return false;
    }
  }
}
