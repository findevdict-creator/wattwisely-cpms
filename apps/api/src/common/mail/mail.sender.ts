import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { ApiConfig } from '../../config/api.config';
import { MailMessage } from './mail-message';

/**
 * Sends e-mail through the SMTP server in the settings (Mailpit on a local trial).
 * Tests replace this provider with one that only records the messages.
 */
@Injectable()
export class MailSender {
  private readonly transport: Transporter;

  constructor(private readonly config: ApiConfig) {
    const hasLogin = config.smtpUser.length > 0;
    this.transport = createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      requireTLS: config.smtpStartTls,
      auth: hasLogin ? { user: config.smtpUser, pass: config.smtpPassword } : undefined,
    });
  }

  /** The sender's address is the platform's; a branded message only lends it its name. */
  async send(message: MailMessage): Promise<void> {
    const { fromName, ...mail } = message;
    const from = fromName
      ? { name: fromName, address: this.config.smtpFrom }
      : this.config.smtpFrom;
    await this.transport.sendMail({ from, ...mail });
  }
}
