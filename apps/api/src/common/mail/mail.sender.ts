import { Injectable } from '@nestjs/common';
import { SmtpMailSender } from '@wattwisely/mail';
import { ApiConfig } from '../../config/api.config';

/**
 * Sends the API's e-mail through the SMTP server in the settings (Mailpit on a local trial),
 * with the shared sender from packages/mail. Tests replace this provider with one that only
 * records the messages.
 */
@Injectable()
export class MailSender extends SmtpMailSender {
  constructor(config: ApiConfig) {
    super(config);
  }
}
