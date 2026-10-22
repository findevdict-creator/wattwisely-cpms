import { Injectable, Logger } from '@nestjs/common';
import { ApiConfig } from '../../config/api.config';
import { MailSender } from '../../common/mail/mail.sender';

/** What goes into an invitation e-mail. */
export interface InvitationEmail {
  to: string;
  tenantName: string;
  inviterName: string;
  roleNames: string[];
  token: string;
  expiresAt: Date;
}

/** Writes and sends the invitation e-mail (story ACC-02). The link opens the portal's invitation page. */
@Injectable()
export class InvitationMailer {
  private readonly logger = new Logger(InvitationMailer.name);

  constructor(
    private readonly config: ApiConfig,
    private readonly mailSender: MailSender,
  ) {}

  /** Returns false instead of failing when the e-mail server refuses: the invitation is saved and can be resent. */
  async send(email: InvitationEmail): Promise<boolean> {
    const link = `${this.config.portalUrl.replace(/\/$/, '')}/invitations/${email.token}`;
    const roles = email.roleNames.join(', ');
    const expires = email.expiresAt.toUTCString();
    const intro = `${email.inviterName} invited you to join ${email.tenantName} on Wattwisely as ${roles}.`;
    try {
      await this.mailSender.send({
        to: email.to,
        subject: `Join ${email.tenantName} on Wattwisely`,
        text: `${intro}\n\nAccept the invitation: ${link}\n\nThe link works until ${expires}.`,
        html: `<p>${InvitationMailer.escape(intro)}</p><p><a href="${link}">Accept the invitation</a></p><p>The link works until ${expires}.</p>`,
      });
      return true;
    } catch (error) {
      this.logger.error(`Invitation e-mail to ${email.to} failed: ${(error as Error).message}`);
      return false;
    }
  }

  private static escape(text: string): string {
    return text.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
  }
}
