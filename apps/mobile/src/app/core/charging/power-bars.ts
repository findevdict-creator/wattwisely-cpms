import { ChargeReading } from '@wattwisely/driver-core';

/**
 * The design's "Power over time" (Figma 10, "Live session"): up to 18 bars, each the average
 * power of an equal share of the readings, as a fraction of the highest bar.
 */
export class PowerBars {
  static readonly COUNT = 18;

  static of(readings: ChargeReading[]): number[] {
    const powers = readings
      .map((reading) => reading.power_w)
      .filter((power): power is number => power !== null);
    if (!powers.length) {
      return [];
    }
    const count = Math.min(PowerBars.COUNT, powers.length);
    const averages = Array.from({ length: count }, (_, index) => {
      const from = Math.floor((index * powers.length) / count);
      const to = Math.floor(((index + 1) * powers.length) / count);
      const share = powers.slice(from, Math.max(to, from + 1));
      return share.reduce((sum, power) => sum + power, 0) / share.length;
    });
    const highest = Math.max(...averages);
    return averages.map((average) => (highest > 0 ? average / highest : 0));
  }

  /** The latest power and battery the charger reported, or null when it reports none. */
  static latest(readings: ChargeReading[], key: 'power_w' | 'soc_percent'): number | null {
    const found = [...readings].reverse().find((reading) => reading[key] !== null);
    return found ? found[key] : null;
  }
}
