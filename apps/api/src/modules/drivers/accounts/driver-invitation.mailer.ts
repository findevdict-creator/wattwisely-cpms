import { Injectable, Logger } from '@nestjs/common';
import { BrandedMailLayout } from '@wattwisely/mail';
import { ApiConfig } from '../../../config/api.config';
import { MailSender } from '../../../common/mail/mail.sender';
import { TenantBrandLookup } from '../../branding/tenant-brand.lookup';

/** What goes into a driver's invitation e-mail. */
export interface DriverInvitationEmail {
  to: string;
  tenantId: string;
  driverName: string;
  inviterName: string;
  token: string;
  expiresAt: Date;
}

/**
 * Writes and sends the e-mail that invites a driver to the app (module 19, story DRV-04), in
 * the operator's brand (module 8). The link opens the driver app's invitation page.
 */
@Injectable()
export class DriverInvitationMailer {
  private readonly logger = new Logger(DriverInvitationMailer.name);

  constructor(
    private readonly config: ApiConfig,
    private readonly mailSender: MailSender,
    private readonly brands: TenantBrandLookup,
  ) {}

  /** Returns false instead of failing when the e-mail server refuses: the invitation is saved and can be resent. */
  async send(email: DriverInvitationEmail): Promise<boolean> {
    const brand = await this.brands.load(email.tenantId);
    const link = `${this.config.driverUrl.replace(/\/$/, '')}/invitations/${email.token}`;
    const message = BrandedMailLayout.render(brand, {
      subject: `Charge with ${brand.name} from your phone`,
      headline: `${email.inviterName} invited you to charge with ${brand.name}`,
      paragraphs: [
        `${brand.name} keeps a driver record for ${email.driverName}. Accept the invitation to link it to your own login: you will see your charges, start one from the app, and pay with a card you save once.`,
        'If you did not expect this, you can ignore the e-mail or decline on the page.',
      ],
      action: { label: 'Open the invitation', url: link },
      footnote: `The link works until ${email.expiresAt.toUTCString()}.`,
    });
    try {
      await this.mailSender.send({ to: email.to, ...message });
      return true;
    } catch (error) {
      this.logger.error(
        `Driver invitation e-mail to ${email.to} failed: ${(error as Error).message}`,
      );
      return false;
    }
  }
}
