/**
 * When a failed delivery is tried again (module 16): soon at first, then with a growing wait,
 * about fifteen hours in all. After the last try the delivery is failed for good; the
 * endpoint's page shows it, and the receiver can fetch what it missed from the API.
 */
export class WebhookRetrySchedule {
  /** The wait after the first, second, ... failed attempt, in seconds. */
  static readonly WAITS_SECONDS = [60, 300, 1_800, 7_200, 43_200];
  static readonly MAX_ATTEMPTS = WebhookRetrySchedule.WAITS_SECONDS.length + 1;

  /** When to try again after `attempts` failed tries, or null when they are used up. */
  static nextAttemptAt(attempts: number, now: Date): Date | null {
    const wait = WebhookRetrySchedule.WAITS_SECONDS[attempts - 1];
    return wait === undefined ? null : new Date(now.getTime() + wait * 1000);
  }
}
