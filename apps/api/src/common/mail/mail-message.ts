/** An e-mail ready to send. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** The name shown as the sender, e.g. the tenant's brand; the address is always the platform's. */
  fromName?: string;
}
