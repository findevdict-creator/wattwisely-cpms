import { OpeningHours } from '../../core/api/models/site';
import { OpeningHoursForm } from './opening-hours-form';

/** Consecutive days with the same hours, e.g. Mon–Fri 08:00–18:00. */
interface DayRun {
  from: string;
  to: string;
  hours: string;
}

/** Opening hours as one line of text, e.g. "Mon–Fri 08:00–18:00, Sat 10:00–14:00". */
export class OpeningHoursText {
  static describe(hours: OpeningHours | null): string {
    if (!hours) {
      return 'Open 24 hours a day';
    }
    const runs = OpeningHoursText.runsOf(hours).filter((run) => run.hours);
    if (runs.length === 0) {
      return 'Closed';
    }
    return runs
      .map((run) => `${run.from === run.to ? run.from : `${run.from}–${run.to}`} ${run.hours}`)
      .join(', ');
  }

  /** One run per stretch of days with the same hours; closed days are runs with empty hours. */
  private static runsOf(hours: OpeningHours): DayRun[] {
    const runs: DayRun[] = [];
    for (const { key, label } of OpeningHoursForm.WEEKDAYS) {
      const day = label.slice(0, 3);
      const text = hours[key]?.map((p) => `${p.opens}–${p.closes}`).join(', ') ?? '';
      const last = runs[runs.length - 1];
      if (last && last.hours === text) {
        last.to = day;
      } else {
        runs.push({ from: day, to: day, hours: text });
      }
    }
    return runs;
  }
}
