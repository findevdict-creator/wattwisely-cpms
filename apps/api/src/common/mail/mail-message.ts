/** An e-mail ready to send. */
export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}
