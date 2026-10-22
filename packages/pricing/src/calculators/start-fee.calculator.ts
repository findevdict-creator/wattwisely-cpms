import { PricingTariff } from '../model/pricing-tariff';
import { PricedLine } from './priced-line';

/** The fixed fee for starting a session, when the tariff has one. */
export class StartFeeCalculator {
  lines(tariff: Pick<PricingTariff, 'startFee'>, startedAt: Date): PricedLine[] {
    if (tariff.startFee <= 0) {
      return [];
    }
    return [
      {
        kind: 'start_fee',
        bandName: null,
        from: startedAt,
        to: null,
        quantity: 1,
        unit: 'session',
        unitPrice: null,
        amount: tariff.startFee,
      },
    ];
  }
}
