import { TariffBand } from '../model/tariff-band';
import { Weekday } from '../model/weekday';
import { TariffCoverage } from './tariff-coverage';

const EVERY_DAY: Weekday[] = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

class Bands {
  static of(name: string, start: string, end: string, days: Weekday[] = EVERY_DAY): TariffBand {
    return {
      name,
      days,
      start,
      end,
      energyPricePerKwh: 3000,
      timePricePerHour: 0,
      idleFeePerMinute: 0,
    };
  }
}

describe('TariffCoverage', () => {
  it('accepts bands that cover the week once, including one that wraps past midnight', () => {
    expect(
      TariffCoverage.check([
        Bands.of('Day', '07:00', '23:00'),
        Bands.of('Night', '23:00', '07:00'),
      ]),
    ).toEqual([]);
  });

  it('names the gaps', () => {
    const problems = TariffCoverage.check([
      Bands.of('Weekdays', '00:00', '24:00', ['mon', 'tue', 'wed', 'thu', 'fri']),
      Bands.of('Saturday', '00:00', '12:00', ['sat']),
    ]);

    expect(problems).toEqual([
      'sat 12:00 to 24:00 has no band.',
      'sun 00:00 to 24:00 has no band.',
    ]);
  });

  it('names the overlaps', () => {
    const problems = TariffCoverage.check([
      Bands.of('Day', '06:00', '22:00'),
      Bands.of('Night', '21:00', '06:00'),
    ]);

    expect(problems).toHaveLength(7);
    expect(problems[0]).toBe('mon 21:00 to 22:00 is in more than one band.');
  });

  it('refuses malformed bands before looking at coverage', () => {
    expect(TariffCoverage.check([])).toEqual(['Add at least one band.']);
    expect(TariffCoverage.check([Bands.of('Odd', '7am', '24:00')])).toEqual([
      'Odd: start and end must be times like 08:00.',
    ]);
    expect(TariffCoverage.check([Bands.of('', '08:00', '08:00', [])])).toEqual([
      'Band 1: start and end are the same time.',
      'Band 1: pick at least one day.',
    ]);
  });
});
