import { ManagedServiceErrors } from './managed-service-errors';

/**
 * The notice period of a managed service (story MGT-05): either side can end it with
 * 30 days' notice. Without a date the service ends exactly 30 days from now; an earlier
 * date is refused, a later one is kept.
 */
export class ManagedNoticePolicy {
  static readonly NOTICE_DAYS = 30;

  static earliestEnd(now: Date): Date {
    return new Date(now.getTime() + ManagedNoticePolicy.NOTICE_DAYS * 24 * 60 * 60 * 1000);
  }

  /** The end date to store for a request, or a 422 when it comes too early. */
  static endsAtFor(requested: Date | null, now: Date = new Date()): Date {
    const earliest = ManagedNoticePolicy.earliestEnd(now);
    if (!requested) {
      return earliest;
    }
    if (requested.getTime() < earliest.getTime()) {
      throw ManagedServiceErrors.noticeTooShort(earliest);
    }
    return requested;
  }
}
