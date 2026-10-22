import { TariffCoverage } from '@wattwisely/pricing';
import { TariffPricesRequestDto } from './dto/tariff-prices-request.dto';
import { TariffPrices } from './tariff-prices';

/**
 * The checks on a version's prices beyond their shape: the bands cover every hour of the
 * week exactly once (so the engine never meets a gap), and the minimum is not above the maximum.
 */
export class TariffPriceRules {
  static problemsOf(prices: TariffPricesRequestDto): string[] {
    const problems = TariffCoverage.check(TariffPrices.bandsFrom(prices.bands));
    const { minimum_price: minimum, maximum_price: maximum } = prices;
    if (minimum !== null && minimum !== undefined && maximum !== null && maximum !== undefined) {
      if (minimum > maximum) {
        problems.push('The minimum price is above the maximum price.');
      }
    }
    return problems;
  }
}
