import * as fc from 'fast-check';
import { PricingTariff } from './model/pricing-tariff';
import { MeterPoint, PricingUsage } from './model/pricing-usage';
import { PricingEngine } from './pricing-engine';

/** Random tariffs and sessions with a sample every minute, for the property tests. */
class Arbitraries {
  static readonly START = Date.UTC(2026, 2, 27, 20, 0);
  static readonly MINUTE = 60_000;
  static readonly ZONES = ['Europe/London', 'Europe/Berlin', 'America/New_York', 'Asia/Kolkata'];

  static tariff(): fc.Arbitrary<PricingTariff> {
    return fc
      .record({
        zone: fc.constantFrom(...Arbitraries.ZONES),
        split: fc.integer({ min: 1, max: 23 }),
        prices: fc.array(fc.integer({ min: 0, max: 9000 }), { minLength: 4, maxLength: 4 }),
        taxRate: fc.integer({ min: 0, max: 2500 }),
        isTaxIncluded: fc.boolean(),
      })
      .map(({ zone, split, prices, taxRate, isTaxIncluded }) => ({
        currency: 'GBP',
        timeZone: zone,
        taxRate,
        isTaxIncluded,
        startFee: 0,
        idleGraceMinutes: 0,
        idleFeeCap: null,
        minimumPrice: null,
        maximumPrice: null,
        isFreeWithoutEnergy: true,
        bands: [
          Arbitraries.band(
            'Early',
            '00:00',
            `${String(split).padStart(2, '0')}:00`,
            prices.slice(0, 2),
          ),
          Arbitraries.band(
            'Late',
            `${String(split).padStart(2, '0')}:00`,
            '24:00',
            prices.slice(2, 4),
          ),
        ],
      }));
  }

  /** Per-minute energy (Wh) for a session that starts somewhere in the first two days. */
  static minutes(): fc.Arbitrary<{ offset: number; wh: number[] }> {
    return fc.record({
      offset: fc.integer({ min: 0, max: 48 * 60 }),
      wh: fc.array(fc.integer({ min: 0, max: 400 }), { minLength: 2, maxLength: 600 }),
    });
  }

  static band(name: string, start: string, end: string, prices: number[]) {
    return {
      name,
      days: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as PricingTariff['bands'][0]['days'],
      start,
      end,
      energyPricePerKwh: prices[0],
      timePricePerHour: prices[1],
      idleFeePerMinute: 0,
    };
  }

  /** The session from minute `from` to minute `to` of the generated minutes. */
  static usage(offset: number, wh: number[], from: number, to: number): PricingUsage {
    const series: MeterPoint[] = [];
    let delivered = 0;
    for (let minute = from; minute <= to; minute += 1) {
      series.push({ at: Arbitraries.at(offset + minute), wh: delivered });
      delivered += wh[minute] ?? 0;
    }
    const startedAt = Arbitraries.at(offset + from);
    const endedAt = Arbitraries.at(offset + to);
    return {
      startedAt,
      endedAt,
      series,
      chargingPeriods: [{ from: startedAt, to: endedAt }],
      idlePeriods: [],
      flags: [],
    };
  }

  static at(minute: number): Date {
    return new Date(Arbitraries.START + minute * Arbitraries.MINUTE);
  }
}

describe('PricingEngine properties', () => {
  const engine = new PricingEngine();

  it('adds the lines up to the totals, and each line is net plus tax', () => {
    fc.assert(
      fc.property(Arbitraries.tariff(), Arbitraries.minutes(), (tariff, { offset, wh }) => {
        const result = engine.price(tariff, Arbitraries.usage(offset, wh, 0, wh.length - 1));

        const sum = (key: 'net' | 'tax' | 'gross') =>
          result.lines.reduce((total, line) => total + line[key], 0);
        expect(sum('net')).toBe(result.netTotal);
        expect(sum('tax')).toBe(result.taxTotal);
        expect(sum('gross')).toBe(result.grossTotal);
        for (const line of result.lines) {
          expect(line.net + line.tax).toBe(line.gross);
          expect(Number.isInteger(line.gross)).toBe(true);
        }
      }),
    );
  });

  it('never charges a negative amount without a maximum price', () => {
    fc.assert(
      fc.property(Arbitraries.tariff(), Arbitraries.minutes(), (tariff, { offset, wh }) => {
        const result = engine.price(tariff, Arbitraries.usage(offset, wh, 0, wh.length - 1));

        expect(result.lines.every((line) => line.net >= 0 && line.tax >= 0)).toBe(true);
        expect(result.energyWh).toBe(wh.slice(0, -1).reduce((total, value) => total + value, 0));
      }),
    );
  });

  // The split cuts at most one energy line and one time line in two. Each cut line is
  // rounded twice instead of once: at most one minor unit on the amount, and one more on
  // the tax when tax is added on top of the prices.
  it('changes the total by at most one minor unit per line cut in two when a session is split', () => {
    fc.assert(
      fc.property(
        Arbitraries.tariff(),
        Arbitraries.minutes(),
        fc.double({ min: 0.01, max: 0.99, noNaN: true }),
        (tariff, { offset, wh }, at) => {
          const last = wh.length - 1;
          const split = Math.max(1, Math.min(last - 1, Math.round(last * at)));
          fc.pre(split > 0 && split < last);
          const whole = engine.price(tariff, Arbitraries.usage(offset, wh, 0, last));
          const first = engine.price(tariff, Arbitraries.usage(offset, wh, 0, split));
          const second = engine.price(tariff, Arbitraries.usage(offset, wh, split, last));

          const difference = first.grossTotal + second.grossTotal - whole.grossTotal;
          const perLine = tariff.isTaxIncluded ? 1 : 2;
          expect(Math.abs(difference)).toBeLessThanOrEqual(2 * perLine);
        },
      ),
      { numRuns: 300 },
    );
  });

  it('gives the same hash for the same input and a different one when anything changes', () => {
    fc.assert(
      fc.property(Arbitraries.tariff(), Arbitraries.minutes(), (tariff, { offset, wh }) => {
        const usage = Arbitraries.usage(offset, wh, 0, wh.length - 1);
        const hash = engine.price(tariff, usage).inputHash;

        expect(engine.price(structuredClone(tariff), structuredClone(usage)).inputHash).toBe(hash);
        const changed = { ...tariff, taxRate: tariff.taxRate + 1 };
        expect(engine.price(changed, usage).inputHash).not.toBe(hash);
      }),
      { numRuns: 50 },
    );
  });
});
