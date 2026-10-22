/** Day keys in ISO order, Monday first; the same words the site's opening hours use. */
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

/** The week as a ring, so a band that wraps past midnight knows which day comes before. */
export class Weekdays {
  static readonly ALL: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

  static previous(day: Weekday): Weekday {
    const index = Weekdays.ALL.indexOf(day);
    return Weekdays.ALL[(index + Weekdays.ALL.length - 1) % Weekdays.ALL.length];
  }

  static isWeekday(value: string): value is Weekday {
    return (Weekdays.ALL as string[]).includes(value);
  }
}
