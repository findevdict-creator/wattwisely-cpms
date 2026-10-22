import { EnergyCalculator } from './calculators/energy.calculator';
import { IdleFeeCalculator } from './calculators/idle-fee.calculator';
import { IdleGrace } from './calculators/idle-grace';
import { LimitAdjuster } from './calculators/limit.adjuster';
import { LineAmounts } from './calculators/line-amounts';
import { PeriodMath } from './calculators/period-math';
import { PricedLine } from './calculators/priced-line';
import { StartFeeCalculator } from './calculators/start-fee.calculator';
import { TaxCalculator } from './calculators/tax.calculator';
import { TimeCalculator } from './calculators/time.calculator';
import { InputHash } from './input-hash';
import { MeterInterpolator } from './meter/meter-interpolator';
import { PricingError } from './model/pricing-error';
import { LineItem, PricingResult } from './model/pricing-result';
import { PricingTariff } from './model/pricing-tariff';
import { Period, PricingUsage } from './model/pricing-usage';
import { PricingSpan } from './pricing-span';
import { ReviewFlags } from './review-flags';
import { LocalTimeSegmenter, Segment } from './segments/local-time-segmenter';
import { SegmentMerger } from './segments/segment-merger';
import { TariffCoverage } from './segments/tariff-coverage';

/**
 * The pricing engine (Sessions and Pricing design): a pure function from a tariff
 * version and a session's usage to a receipt. The same input always gives the same
 * result, so a session can be priced while it runs and again when it ends.
 */
export class PricingEngine {
  static readonly VERSION = '1.0.0';

  price(tariff: PricingTariff, usage: PricingUsage): PricingResult {
    const problems = TariffCoverage.check(tariff.bands);
    if (problems.length > 0) {
      throw new PricingError(problems);
    }
    const segmenter = new LocalTimeSegmenter(tariff);
    const span = PricingSpan.of(usage);
    const segments = SegmentMerger.mergeAdjacent(segmenter.split(span.from, span.to));
    const meter = new MeterInterpolator(usage.series);
    const energyWh = Math.round(meter.between(span.from, span.to));
    const billableIdle = IdleGrace.apply(usage.idlePeriods, tariff.idleGraceMinutes * 60);
    const tax = new TaxCalculator(tariff);
    const isFree = energyWh === 0 && tariff.isFreeWithoutEnergy;
    const priced = isFree ? [] : this.pricedLines(tariff, usage, { segments, meter, billableIdle });
    const lines = new LimitAdjuster(tariff, tax).adjust(priced.map((line) => tax.apply(line)));
    return {
      engineVersion: PricingEngine.VERSION,
      inputHash: InputHash.of({ tariff, usage }),
      currency: tariff.currency,
      lines,
      ...PricingEngine.totalsOf(lines),
      energyWh,
      chargingMinutes: PricingEngine.wholeMinutes(usage.chargingPeriods),
      idleMinutes: PricingEngine.wholeMinutes(usage.idlePeriods),
      billableIdleMinutes: PricingEngine.wholeMinutes(billableIdle),
      flags: ReviewFlags.of(usage, segmenter, energyWh),
    };
  }

  private pricedLines(
    tariff: PricingTariff,
    usage: PricingUsage,
    parts: { segments: Segment[]; meter: MeterInterpolator; billableIdle: Period[] },
  ): PricedLine[] {
    const amounts = new LineAmounts(tariff.currency);
    return [
      ...new StartFeeCalculator().lines(tariff, usage.startedAt),
      ...new EnergyCalculator(amounts).lines(parts.segments, parts.meter),
      ...new TimeCalculator(amounts).lines(parts.segments, usage.chargingPeriods),
      ...new IdleFeeCalculator(amounts).lines(
        parts.segments,
        parts.billableIdle,
        tariff.idleFeeCap,
      ),
    ];
  }

  private static totalsOf(
    lines: LineItem[],
  ): Pick<PricingResult, 'netTotal' | 'taxTotal' | 'grossTotal'> {
    return {
      netTotal: lines.reduce((sum, line) => sum + line.net, 0),
      taxTotal: lines.reduce((sum, line) => sum + line.tax, 0),
      grossTotal: lines.reduce((sum, line) => sum + line.gross, 0),
    };
  }

  private static wholeMinutes(periods: Period[]): number {
    const seconds = PeriodMath.normalise(periods).reduce(
      (sum, period) => sum + PeriodMath.seconds(period),
      0,
    );
    return Math.round(seconds / 60);
  }
}
