import { MailMessage } from '@wattwisely/mail';

/** Stands in for WorkerMailSender in tests: keeps every message instead of sending it. */
export class RecordingMailSender {
  readonly sent: MailMessage[] = [];
  /** The error the next sends throw, e.g. an SMTP refusal with a responseCode. */
  failure: Error | null = null;

  async send(message: MailMessage): Promise<void> {
    if (this.failure) {
      throw this.failure;
    }
    this.sent.push(message);
  }

  to(address: string): MailMessage[] {
    return this.sent.filter((message) => message.to === address);
  }
}
