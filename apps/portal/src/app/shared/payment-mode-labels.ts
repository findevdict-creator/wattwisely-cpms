/** The words for a payment mode (module 19), from the operator's point of view. */
export class PaymentModeLabels {
  static readonly DRIVER: Record<string, string> = {
    inherit: 'As their groups say, else paid',
    pay: 'Always paid by the driver',
    free: 'Free: you pay',
  };

  static readonly CARD: Record<string, string> = {
    inherit: 'As the driver',
    pay: 'Always paid',
    free: 'Free',
  };

  static driver(mode: string): string {
    return PaymentModeLabels.DRIVER[mode] ?? mode;
  }

  static card(mode: string): string {
    return PaymentModeLabels.CARD[mode] ?? mode;
  }
}
