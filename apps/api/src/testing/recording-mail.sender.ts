import { MailMessage } from '@wattwisely/mail';

/** Stands in for MailSender in tests: keeps every message instead of sending it. */
export class RecordingMailSender {
  readonly sent: MailMessage[] = [];
  isFailing = false;

  async send(message: MailMessage): Promise<void> {
    if (this.isFailing) {
      throw new Error('SMTP server refused the message');
    }
    this.sent.push(message);
  }

  /** The invitation token from the last e-mail sent to this address. */
  lastInvitationToken(to: string): string {
    const message = [...this.sent].reverse().find((candidate) => candidate.to === to);
    const match = message?.text.match(/\/invitations\/([\w-]+)/);
    if (!match) {
      throw new Error(`No invitation e-mail to ${to}`);
    }
    return match[1];
  }
}
