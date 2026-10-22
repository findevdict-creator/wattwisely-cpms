import { PricingUsage } from './model/pricing-usage';
import { Period } from './model/pricing-usage';

/** The whole stretch a session is priced over: from the start until the last idle or charging moment. */
export class PricingSpan {
  static of(usage: PricingUsage): Period {
    const ends = [
      usage.endedAt,
      ...usage.chargingPeriods.map((period) => period.to),
      ...usage.idlePeriods.map((period) => period.to),
    ].map((end) => end.getTime());
    const to = Math.max(usage.startedAt.getTime(), ...ends);
    return { from: usage.startedAt, to: new Date(to) };
  }
}
