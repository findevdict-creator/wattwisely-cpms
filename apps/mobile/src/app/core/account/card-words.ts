import { PaymentMethod } from '@wattwisely/driver-core';
import { PlugWords } from '../charging/plug-words';

/**
 * A saved card in the words of the design's "Payment methods" (Figma 11): "Visa •••• 4242",
 * "Expires 04/28", "Expired 09/26". A card works to the last day of its expiry month.
 */
export class CardWords {
  static name(card: PaymentMethod): string {
    return PlugWords.card(card.brand, card.last4);
  }

  static expiry(card: PaymentMethod, now = new Date()): string {
    const date = `${String(card.exp_month).padStart(2, '0')}/${String(card.exp_year % 100).padStart(2, '0')}`;
    return `${CardWords.isExpired(card, now) ? 'Expired' : 'Expires'} ${date}`;
  }

  static isExpired(card: PaymentMethod, now = new Date()): boolean {
    const firstDayAfter = new Date(Date.UTC(card.exp_year, card.exp_month, 1));
    return now.getTime() >= firstDayAfter.getTime();
  }

  /** The Account menu's line under "Payment methods". */
  static summary(cards: PaymentMethod[]): string {
    const card = cards.find((item) => item.is_default) ?? cards[0];
    return card ? `${CardWords.name(card)} is default` : 'No card yet';
  }
}
