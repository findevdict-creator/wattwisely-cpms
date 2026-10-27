import { ReportSchedule, ReportScheduleRequest } from '../../core/api/models/report';

/** The schedule form's recipients box: addresses split by commas, spaces or new lines. */
export class ScheduleForm {
  private static readonly EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  static recipients(text: string): string[] {
    return [...new Set(text.split(/[\s,;]+/).filter((part) => part !== ''))];
  }

  /** An error to show, or ''. */
  static problem(name: string, recipients: string[]): string {
    if (name.trim() === '') {
      return 'Give the report a name.';
    }
    if (recipients.length === 0) {
      return 'Add at least one e-mail address.';
    }
    const bad = recipients.find((address) => !ScheduleForm.EMAIL.test(address));
    return bad === undefined ? '' : `${bad} is not an e-mail address.`;
  }

  /** A new schedule's starting values, or an existing one's. */
  static initial(schedule: ReportSchedule | null, timeZone: string): ReportScheduleRequest {
    if (schedule) {
      return {
        name: schedule.name,
        frequency: schedule.frequency,
        group_by: schedule.group_by,
        site_id: schedule.site_id,
        recipients: schedule.recipients,
        time_zone: schedule.time_zone,
        is_active: schedule.is_active,
      };
    }
    return {
      name: 'Weekly usage',
      frequency: 'weekly',
      group_by: 'site',
      site_id: null,
      recipients: [],
      time_zone: timeZone,
      is_active: true,
    };
  }
}
