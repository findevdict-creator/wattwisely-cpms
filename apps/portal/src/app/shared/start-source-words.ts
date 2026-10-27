/** How a session was started (module 19), in the portal's words. */
export class StartSourceWords {
  static readonly WORDS: Record<string, string> = {
    rfid_card: 'RFID card',
    guest_card: 'Card at the QR page',
    chat: 'Chat link',
    account: 'Driver app',
    staff: 'Started by staff',
  };

  static of(source: string | null): string {
    return source ? (StartSourceWords.WORDS[source] ?? source) : '';
  }
}
