import { expect } from '@playwright/test';
import { StackUrls } from './stack-urls';

export interface MailSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
  Created: string;
}

/** Mailpit catches every e-mail the stack sends (Keycloak, the API and the worker). */
export class Mailpit {
  static async search(query: string): Promise<MailSummary[]> {
    const url = `${StackUrls.MAILPIT}/api/v1/search?query=${encodeURIComponent(query)}&limit=50`;
    const response = await fetch(url);
    return ((await response.json()) as { messages: MailSummary[] }).messages ?? [];
  }

  /** Waits for a message to `to` whose subject contains `subject`, sent after `since`. */
  static async waitFor(to: string, subject: string, since = new Date(0)): Promise<MailSummary> {
    let found: MailSummary | undefined;
    await expect
      .poll(
        async () => {
          const messages = await Mailpit.search(`to:"${to}" subject:"${subject}"`);
          found = messages.find((message) => new Date(message.Created) >= since);
          return found !== undefined;
        },
        { timeout: 60_000, message: `an e-mail to ${to} about "${subject}"` },
      )
      .toBe(true);
    return found as MailSummary;
  }

  static async text(id: string): Promise<string> {
    const response = await fetch(`${StackUrls.MAILPIT}/api/v1/message/${id}`);
    const message = (await response.json()) as { Text: string; HTML: string };
    return `${message.Text}\n${message.HTML}`;
  }

  /** The first link in the message that starts with `prefix`. */
  static async link(id: string, prefix: string): Promise<string> {
    const body = await Mailpit.text(id);
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = body.match(new RegExp(`${escaped}[^\\s"'<>)]*`));
    expect(match, `a link starting ${prefix}`).not.toBeNull();
    return (match as RegExpMatchArray)[0].replace(/&amp;/g, '&');
  }
}
