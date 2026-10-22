import { TariffBand } from '../model/tariff-band';
import { LocalTimeSegmenter } from './local-time-segmenter';

class Tariffs {
  static band(name: string, start: string, end: string): TariffBand {
    return {
      name,
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'],
      start,
      end,
      energyPricePerKwh: 1000,
      timePricePerHour: 0,
      idleFeePerMinute: 0,
    };
  }

  static segmenter(timeZone: string, ...bands: TariffBand[]): LocalTimeSegmenter {
    return new LocalTimeSegmenter({ timeZone, bands });
  }
}

describe('LocalTimeSegmenter', () => {
  it('cuts at band edges and midnight in the site time zone', () => {
    const segmenter = Tariffs.segmenter(
      'America/New_York',
      Tariffs.band('Day', '08:00', '20:00'),
      Tariffs.band('Night', '20:00', '08:00'),
    );

    const segments = segmenter.split(
      new Date('2026-06-01T22:00:00Z'),
      new Date('2026-06-02T13:00:00Z'),
    );

    expect(segments.map((segment) => [segment.band.name, segment.from.toISOString()])).toEqual([
      ['Day', '2026-06-01T22:00:00.000Z'],
      ['Night', '2026-06-02T00:00:00.000Z'],
      ['Night', '2026-06-02T04:00:00.000Z'],
      ['Day', '2026-06-02T12:00:00.000Z'],
    ]);
  });

  it('reads band edges on the wall clock across the spring daylight saving change', () => {
    const segmenter = Tariffs.segmenter(
      'Europe/Berlin',
      Tariffs.band('Night', '00:00', '06:00'),
      Tariffs.band('Day', '06:00', '24:00'),
    );

    const boundaries = segmenter.boundariesBetween(
      new Date('2026-03-28T12:00:00Z'),
      new Date('2026-03-29T12:00:00Z'),
    );

    expect(boundaries.map((boundary) => boundary.toISOString())).toEqual([
      '2026-03-28T23:00:00.000Z',
      '2026-03-29T01:00:00.000Z',
      '2026-03-29T04:00:00.000Z',
    ]);
  });

  it('meets a band edge twice when the clocks go back over it', () => {
    const segmenter = Tariffs.segmenter(
      'Europe/London',
      Tariffs.band('A', '00:00', '01:30'),
      Tariffs.band('B', '01:30', '24:00'),
    );

    const segments = segmenter.split(
      new Date('2026-10-25T00:00:00Z'),
      new Date('2026-10-25T02:00:00Z'),
    );

    expect(segments.map((segment) => segment.band.name)).toEqual(['A', 'B', 'A', 'B']);
  });

  it('throws when no band covers a moment', () => {
    const segmenter = Tariffs.segmenter('UTC', Tariffs.band('Day', '08:00', '20:00'));

    expect(() =>
      segmenter.split(new Date('2026-06-01T21:00:00Z'), new Date('2026-06-01T22:00:00Z')),
    ).toThrow('No band covers mon 21:00.');
  });
});
