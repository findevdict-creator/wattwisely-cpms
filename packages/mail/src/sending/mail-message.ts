/** A file sent along with an e-mail, e.g. a scheduled report's CSV. */
export interface MailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

/** An e-mail ready to send. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** The name shown as the sender, e.g. the tenant's brand; the address is always the platform's. */
  fromName?: string;
  /** Where replies go, e.g. the tenant's support address on a driver's receipt. */
  replyTo?: string;
  attachments?: MailAttachment[];
}
