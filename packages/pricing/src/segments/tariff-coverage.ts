import { LocalTime } from '../model/local-time';
import { TariffBand } from '../model/tariff-band';
import { Weekday, Weekdays } from '../model/weekday';
import { BandMatcher } from './band-matcher';

/**
 * Checks that a tariff's bands cover all 168 hours of the week exactly once, so the
 * engine never meets a gap or has to choose between two bands. Minute resolution.
 */
export class TariffCoverage {
  static readonly MINUTES = 24 * 60;

  /** Problems in plain words; an empty list means the bands are fine. */
  static check(bands: TariffBand[]): string[] {
    const problems = TariffCoverage.shapeProblems(bands);
    if (problems.length > 0) {
      return problems;
    }
    const matcher = new BandMatcher(bands);
    for (const day of Weekdays.ALL) {
      problems.push(...TariffCoverage.dayProblems(matcher, day));
    }
    return problems;
  }

  private static shapeProblems(bands: TariffBand[]): string[] {
    const problems: string[] = [];
    if (bands.length === 0) {
      problems.push('Add at least one band.');
    }
    bands.forEach((band, index) => {
      const label = band.name.trim() || `Band ${index + 1}`;
      if (LocalTime.parse(band.start) === null || LocalTime.parse(band.end) === null) {
        problems.push(`${label}: start and end must be times like 08:00.`);
      } else if (band.start === band.end) {
        problems.push(`${label}: start and end are the same time.`);
      }
      if (band.days.length === 0) {
        problems.push(`${label}: pick at least one day.`);
      }
    });
    return problems;
  }

  private static dayProblems(matcher: BandMatcher, day: Weekday): string[] {
    const names = new Array<string[]>(TariffCoverage.MINUTES);
    for (let minute = 0; minute < TariffCoverage.MINUTES; minute += 1) {
      names[minute] = matcher.windows
        .filter((window) => BandMatcher.covers(window, day, minute * 60))
        .map((window) => window.band.name);
    }
    return [
      ...TariffCoverage.runs(names, day, (found) => found.length === 0, 'has no band'),
      ...TariffCoverage.runs(names, day, (found) => found.length > 1, 'is in more than one band'),
    ];
  }

  /** Each stretch of minutes where the condition holds, as "mon 06:00 to 07:00 has no band". */
  private static runs(
    names: string[][],
    day: Weekday,
    isProblem: (found: string[]) => boolean,
    text: string,
  ): string[] {
    const problems: string[] = [];
    let runStart = -1;
    for (let minute = 0; minute <= names.length; minute += 1) {
      const isInRun = minute < names.length && isProblem(names[minute]);
      if (isInRun && runStart < 0) {
        runStart = minute;
      } else if (!isInRun && runStart >= 0) {
        problems.push(
          `${day} ${LocalTime.format(runStart * 60)} to ${LocalTime.format(minute * 60)} ${text}.`,
        );
        runStart = -1;
      }
    }
    return problems;
  }
}
