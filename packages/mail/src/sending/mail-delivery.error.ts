/**
 * Whether a failed send is worth trying again. An SMTP reply in the 500s means the server
 * refused the address or the message for good (mailbox unknown, rejected); anything else
 * (a 400s reply, a refused connection, a timeout) may pass on the next try.
 */
export class MailDeliveryError {
  static isPermanent(error: unknown): boolean {
    const code = (error as { responseCode?: unknown } | null)?.responseCode;
    return typeof code === 'number' && code >= 500 && code < 600;
  }
}
