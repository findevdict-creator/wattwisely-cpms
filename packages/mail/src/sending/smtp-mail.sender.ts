import { createTransport, Transporter } from 'nodemailer';
import { MailMessage } from './mail-message';
import { SmtpSettings } from './smtp-settings';

/**
 * Sends e-mail through the SMTP server in the settings (Mailpit on a local trial). The API
 * and the worker each wrap it in their own injectable sender; tests replace that one.
 */
export class SmtpMailSender {
  private readonly transport: Transporter;

  constructor(private readonly settings: SmtpSettings) {
    const hasLogin = settings.smtpUser.length > 0;
    this.transport = createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort,
      requireTLS: settings.smtpStartTls,
      auth: hasLogin ? { user: settings.smtpUser, pass: settings.smtpPassword } : undefined,
    });
  }

  /** The sender's address is the platform's; a branded message only lends it its name. */
  async send(message: MailMessage): Promise<void> {
    const { fromName, ...mail } = message;
    const from = fromName
      ? { name: fromName, address: this.settings.smtpFrom }
      : this.settings.smtpFrom;
    await this.transport.sendMail({ from, ...mail });
  }
}
