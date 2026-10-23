/**
 * The money rules of a pre-authorisation (Stripe Payments design, "Holds, capture and
 * release"): the charger is stopped when the cost reaches 90% of the hold; the capture
 * can never exceed the hold; a capture the provider could not do is retried with a
 * growing wait for up to 72 hours (card holds last about 7 days).
 */
export class CapturePolicy {
  static readonly AUTO_STOP_RATIO = 0.9;
  static readonly RETRY_WINDOW_MS = 72 * 60 * 60 * 1000;
  static readonly FIRST_RETRY_MS = 60 * 1000;
  static readonly MAX_RETRY_MS = 4 * 60 * 60 * 1000;
  /** The price was more than the hold: the hold is captured in full and finance should look. */
  static readonly ABOVE_HOLD_FLAG = 'capture_above_hold';

  /** What to capture of the hold for a priced session; 0 means the hold is released instead. */
  static amountToCapture(
    grossAmount: number | null,
    authorizedAmount: number,
  ): { amount: number; isAboveHold: boolean } {
    const price = Math.max(0, grossAmount ?? 0);
    return { amount: Math.min(price, authorizedAmount), isAboveHold: price > authorizedAmount };
  }

  static isAutoStopDue(grossAmount: number, authorizedAmount: number): boolean {
    return grossAmount >= Math.ceil(authorizedAmount * CapturePolicy.AUTO_STOP_RATIO);
  }

  /** 1 minute, 2, 4, 8… up to 4 hours between tries. */
  static nextAttemptAt(attemptsSoFar: number, now: Date): Date {
    const wait = Math.min(
      CapturePolicy.FIRST_RETRY_MS * 2 ** Math.max(0, attemptsSoFar),
      CapturePolicy.MAX_RETRY_MS,
    );
    return new Date(now.getTime() + wait);
  }

  static isGivenUp(sessionClosedAt: Date | null, now: Date): boolean {
    return (
      sessionClosedAt !== null &&
      now.getTime() - sessionClosedAt.getTime() > CapturePolicy.RETRY_WINDOW_MS
    );
  }
}
