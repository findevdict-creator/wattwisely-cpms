import { LocalTime } from '../model/local-time';
import { Weekday } from '../model/weekday';

/** A calendar date in the zone. */
export interface LocalDate {
  year: number;
  month: number;
  day: number;
}

/** The wall-clock reading of one instant in a time zone. */
export interface LocalParts extends LocalDate {
  weekday: Weekday;
  secondOfDay: number;
  /** Local wall time minus UTC, in milliseconds. */
  offsetMs: number;
}

/**
 * Reads instants as wall-clock time in a site's zone and turns wall-clock times back
 * into instants, with nothing but Intl. Around a daylight saving change a wall-clock
 * time can happen twice (both instants are returned) or not at all (the instant the
 * clocks jump to is returned).
 */
export class LocalClock {
  static readonly DAY_MS = 24 * 60 * 60 * 1000;
  static readonly WEEKDAYS: Record<string, Weekday> = {
    Mon: 'mon',
    Tue: 'tue',
    Wed: 'wed',
    Thu: 'thu',
    Fri: 'fri',
    Sat: 'sat',
    Sun: 'sun',
  };

  private readonly formatter: Intl.DateTimeFormat;

  constructor(readonly timeZone: string) {
    this.formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      weekday: 'short',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  }

  partsOf(instant: Date): LocalParts {
    const fields: Record<string, string> = {};
    for (const part of this.formatter.formatToParts(instant)) {
      fields[part.type] = part.value;
    }
    const secondOfDay =
      Number(fields['hour']) * 3600 + Number(fields['minute']) * 60 + Number(fields['second']);
    const parts = {
      year: Number(fields['year']),
      month: Number(fields['month']),
      day: Number(fields['day']),
      weekday: LocalClock.WEEKDAYS[fields['weekday']],
      secondOfDay,
    };
    // The wall clock shows whole seconds, so the offset is taken from the instant's whole second.
    const wholeSecond = Math.floor(instant.getTime() / 1000) * 1000;
    return { ...parts, offsetMs: LocalClock.wallOf(parts, secondOfDay) - wholeSecond };
  }

  offsetAt(instant: Date): number {
    return this.partsOf(instant).offsetMs;
  }

  /**
   * Every instant at which the clock shows this date and second of day, earliest first.
   * A skipped time (clocks went forward) gives the one instant the gap ends at.
   */
  instantsAt(date: LocalDate, secondOfDay: number): Date[] {
    const wall = LocalClock.wallOf(date, secondOfDay);
    const candidates = [
      ...new Set(
        [wall - LocalClock.DAY_MS, wall + LocalClock.DAY_MS].map(
          (nearby) => wall - this.offsetAt(new Date(nearby)),
        ),
      ),
    ].sort((a, b) => a - b);
    const valid = candidates.filter((candidate) => this.wallAt(candidate) === wall);
    return (valid.length > 0 ? valid : [Math.max(...candidates)]).map((ms) => new Date(ms));
  }

  /** The first instant at which the clock shows this date and second of day. */
  toInstant(date: LocalDate, secondOfDay: number): Date {
    return this.instantsAt(date, secondOfDay)[0];
  }

  /** Local midnight at the start of the day after this instant's local day. */
  nextMidnight(instant: Date): Date {
    return this.toInstant(this.partsOf(instant), LocalTime.DAY_SECONDS);
  }

  /** The first whole second in (from, to] at which the UTC offset differs from the offset at `from`. */
  transitionBetween(from: Date, to: Date): Date | null {
    const offset = this.offsetAt(from);
    if (this.offsetAt(to) === offset) {
      return null;
    }
    // Clocks change on a whole second: search seconds, the offset at `low` is always `offset`.
    let low = Math.floor(from.getTime() / 1000);
    let high = Math.ceil(to.getTime() / 1000);
    while (high - low > 1) {
      const middle = Math.floor((low + high) / 2);
      if (this.offsetAt(new Date(middle * 1000)) === offset) {
        low = middle;
      } else {
        high = middle;
      }
    }
    return new Date(high * 1000);
  }

  private wallAt(instantMs: number): number {
    const parts = this.partsOf(new Date(instantMs));
    return LocalClock.wallOf(parts, parts.secondOfDay);
  }

  /** The wall-clock reading as if it were UTC, for arithmetic. */
  private static wallOf(date: LocalDate, secondOfDay: number): number {
    return Date.UTC(date.year, date.month - 1, date.day) + secondOfDay * 1000;
  }
}
