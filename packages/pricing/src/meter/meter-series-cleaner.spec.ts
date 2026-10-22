import { MeterSeriesCleaner } from './meter-series-cleaner';

class Readings {
  static at(minute: number, meterWh: number) {
    return { at: new Date(Date.UTC(2026, 2, 10, 10, minute)), meterWh };
  }
}

describe('MeterSeriesCleaner', () => {
  const cleaner = new MeterSeriesCleaner();

  it('sorts by the charger clock, drops duplicates and counts from zero', () => {
    const cleaned = cleaner.clean([
      Readings.at(10, 12_000),
      Readings.at(0, 10_000),
      Readings.at(10, 12_000),
      Readings.at(20, 15_000),
    ]);

    expect(cleaned.series.map((point) => point.wh)).toEqual([0, 2000, 5000]);
    expect(cleaned.flags).toEqual([]);
  });

  it('drops a jump the connector could not deliver and flags it', () => {
    const cleaned = cleaner.clean(
      [Readings.at(0, 0), Readings.at(10, 5000), Readings.at(20, 900_000), Readings.at(30, 10_000)],
      { maxPowerKw: 50 },
    );

    expect(cleaned.series.map((point) => point.wh)).toEqual([0, 5000, 10_000]);
    expect(cleaned.flags).toEqual([MeterSeriesCleaner.FLAG_JUMP]);
  });

  it('shifts every reading by the measured clock drift', () => {
    const cleaned = cleaner.clean([Readings.at(0, 0), Readings.at(5, 100)], {
      clockOffsetMs: 90_000,
    });

    expect(cleaned.series[0].at.toISOString()).toBe('2026-03-10T10:01:30.000Z');
  });

  it('returns nothing for no readings', () => {
    expect(cleaner.clean([])).toEqual({ series: [], flags: [] });
  });
});
