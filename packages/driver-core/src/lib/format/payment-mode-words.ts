/**
 * What a payment mode means for the driver, in a sentence, and a card's state (module 19).
 * Shared by the driver web app and the mobile app.
 */
export class PaymentModeWords {
  private static readonly CARD_STATUS: Record<string, string> = {
    active: 'Works',
    blocked: 'Blocked',
    lost: 'Reported lost',
  };

  static cardStatus(status: string): string {
    return PaymentModeWords.CARD_STATUS[status] ?? status;
  }

  static short(mode: string): string {
    return mode === 'free' ? 'Charges paid by the operator' : 'You pay for your charges';
  }

  static long(mode: string, operatorName: string): string {
    if (mode === 'free') {
      return `${operatorName} pays for your charges: nothing is taken from your card.`;
    }
    if (mode === 'pay') {
      return `You pay for your charges with ${operatorName}.`;
    }
    return `${operatorName}'s standard applies: you pay for your charges.`;
  }
}
