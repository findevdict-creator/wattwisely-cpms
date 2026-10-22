import { LocalTime } from '../model/local-time';
import { TariffBand } from '../model/tariff-band';
import { Weekday, Weekdays } from '../model/weekday';

/** A band with its times as seconds, ready to compare. */
export interface BandWindow {
  band: TariffBand;
  startSeconds: number;
  endSeconds: number;
  /** The band ends on the day after it starts (e.g. 22:00 to 06:00). */
  isWrapping: boolean;
}

/** Finds the band in force at a local day and time of day. */
export class BandMatcher {
  readonly windows: BandWindow[];

  constructor(bands: TariffBand[]) {
    this.windows = bands.map((band) => BandMatcher.windowOf(band));
  }

  static windowOf(band: TariffBand): BandWindow {
    const startSeconds = LocalTime.seconds(band.start);
    const endSeconds = LocalTime.seconds(band.end);
    return { band, startSeconds, endSeconds, isWrapping: endSeconds <= startSeconds };
  }

  /** The band at this moment; throws when the bands leave a gap (the tariff editor refuses those). */
  match(weekday: Weekday, secondOfDay: number): TariffBand {
    const window = this.windows.find((candidate) =>
      BandMatcher.covers(candidate, weekday, secondOfDay),
    );
    if (!window) {
      throw new Error(`No band covers ${weekday} ${LocalTime.format(secondOfDay)}.`);
    }
    return window.band;
  }

  /** Every local time of day at which some band starts or ends on this weekday, in seconds. */
  boundariesOn(weekday: Weekday): number[] {
    const boundaries = new Set<number>([LocalTime.DAY_SECONDS]);
    for (const window of this.windows) {
      if (window.band.days.includes(weekday)) {
        boundaries.add(window.startSeconds);
        boundaries.add(window.isWrapping ? LocalTime.DAY_SECONDS : window.endSeconds);
      }
      if (window.isWrapping && window.band.days.includes(Weekdays.previous(weekday))) {
        boundaries.add(window.endSeconds);
      }
    }
    return [...boundaries].sort((a, b) => a - b);
  }

  static covers(window: BandWindow, weekday: Weekday, secondOfDay: number): boolean {
    if (!window.isWrapping) {
      return (
        window.band.days.includes(weekday) &&
        secondOfDay >= window.startSeconds &&
        secondOfDay < window.endSeconds
      );
    }
    const isLateOnStartDay =
      window.band.days.includes(weekday) && secondOfDay >= window.startSeconds;
    const isEarlyOnNextDay =
      window.band.days.includes(Weekdays.previous(weekday)) && secondOfDay < window.endSeconds;
    return isLateOnStartDay || isEarlyOnNextDay;
  }
}
