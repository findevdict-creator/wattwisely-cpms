import { NotificationSettings } from '../core/api/models/notification';

/** The quiet hours form's values, checked the way the API checks them. */
export class QuietHours {
  private static readonly TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

  /** The browser's own time zone, the default for someone who has not set one. */
  static browserTimeZone(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  }

  /** An error to show, or '' when the values can be saved. */
  static problem(start: string, end: string): string {
    if (!start && !end) {
      return '';
    }
    if (!start || !end) {
      return 'Give both a start and an end time, or leave both empty.';
    }
    if (!QuietHours.TIME.test(start) || !QuietHours.TIME.test(end)) {
      return 'Use times like 22:00.';
    }
    return start === end ? 'The start and end times must differ.' : '';
  }

  static toSettings(start: string, end: string, timeZone: string): NotificationSettings {
    return {
      quiet_hours_start: start || null,
      quiet_hours_end: end || null,
      time_zone: timeZone,
    };
  }
}
