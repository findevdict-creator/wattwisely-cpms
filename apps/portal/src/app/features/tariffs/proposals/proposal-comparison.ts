import { TariffBand, TariffPrices } from '../../../core/api/models/tariff';
import { Money } from '../../../shared/money';
import { TariffBandForm } from '../tariff-band-form';
import { TariffSummary } from '../tariff-summary';

/** One row of a proposal: a price now, the price proposed, and how far it moves. */
export interface ComparisonRow {
  label: string;
  now: string;
  proposed: string;
  change: string;
  tone: 'warn' | 'ok' | 'info' | 'faint';
}

/** One price on both sides: its words, and its amount when a percentage makes sense. */
interface Side {
  text: string;
  amount: number;
}

/** How far a price moves, and the colour that says so. */
type Change = Pick<ComparisonRow, 'change' | 'tone'>;

/** The prices in force next to the prices proposed, row by row ("+12.5%", "Same"). */
export class ProposalComparison {
  /** The limits that get a row when either side has one. */
  private static readonly LIMITS: { label: string; key: 'minimum_price' | 'maximum_price' }[] = [
    { label: 'Minimum price', key: 'minimum_price' },
    { label: 'Maximum price', key: 'maximum_price' },
  ];

  static rows(now: TariffPrices | null, proposed: TariffPrices, currency: string): ComparisonRow[] {
    const rows = proposed.bands.map((band) =>
      ProposalComparison.row(
        ProposalComparison.bandLabel(band),
        ProposalComparison.bandSide(ProposalComparison.bandNamed(now, band.name), currency),
        ProposalComparison.bandSide(band, currency),
      ),
    );
    for (const band of now?.bands ?? []) {
      if (!ProposalComparison.bandNamed(proposed, band.name)) {
        const side = ProposalComparison.bandSide(band, currency);
        rows.push({
          label: ProposalComparison.bandLabel(band),
          now: side?.text ?? '',
          proposed: 'Removed',
          change: 'Removed',
          tone: 'info',
        });
      }
    }
    return [...rows, ...ProposalComparison.feeRows(now, proposed, currency)];
  }

  /** "Peak, Mon–Fri 07:00–22:00" */
  static bandLabel(band: TariffBand): string {
    const hours =
      band.start === '00:00' && band.end === '24:00' ? 'all day' : `${band.start}–${band.end}`;
    return `${band.name}, ${TariffBandForm.daysText(band.days)} ${hours}`;
  }

  private static feeRows(
    now: TariffPrices | null,
    proposed: TariffPrices,
    currency: string,
  ): ComparisonRow[] {
    const money = (amount: number | null | undefined) =>
      amount === undefined ? null : ProposalComparison.moneySide(amount, currency);
    const rows = [
      ProposalComparison.row(
        `Idle fee after ${proposed.idle_grace_minutes} min`,
        ProposalComparison.idleSide(now, currency),
        ProposalComparison.idleSide(proposed, currency),
      ),
      ProposalComparison.row('Start fee', money(now?.start_fee), money(proposed.start_fee)),
    ];
    for (const { label, key } of ProposalComparison.LIMITS) {
      if (now?.[key] || proposed[key]) {
        rows.push(ProposalComparison.row(label, money(now?.[key]), money(proposed[key])));
      }
    }
    return rows;
  }

  private static row(label: string, now: Side | null, proposed: Side | null): ComparisonRow {
    const words = { label, now: now?.text ?? '', proposed: proposed?.text ?? 'None' };
    return { ...words, ...ProposalComparison.changeOf(now, words.proposed, proposed?.amount ?? 0) };
  }

  private static changeOf(now: Side | null, proposedText: string, proposedAmount: number): Change {
    if (now === null) {
      return { change: 'New', tone: 'info' };
    }
    if (now.text === proposedText) {
      return { change: 'Same', tone: 'faint' };
    }
    if (now.amount > 0 && proposedAmount > 0) {
      const percent = Number((((proposedAmount - now.amount) / now.amount) * 100).toFixed(1));
      return percent > 0
        ? { change: `+${percent}%`, tone: 'warn' }
        : { change: `−${Math.abs(percent)}%`, tone: 'ok' };
    }
    return { change: 'Changed', tone: 'info' };
  }

  private static bandSide(band: TariffBand | undefined, currency: string): Side | null {
    if (!band) {
      return null;
    }
    const hourly = Number(band.time_price_per_hour);
    const energy = `${TariffSummary.price(band.energy_price_per_kwh, currency)} per kWh`;
    const text =
      hourly > 0
        ? `${energy} + ${TariffSummary.price(band.time_price_per_hour, currency)} per hour`
        : energy;
    return { text, amount: Number(band.energy_price_per_kwh) };
  }

  private static idleSide(prices: TariffPrices | null, currency: string): Side | null {
    if (prices === null) {
      return null;
    }
    const idle = Math.max(0, ...prices.bands.map((band) => Number(band.idle_fee_per_minute)));
    if (idle === 0) {
      return { text: 'None', amount: 0 };
    }
    const cap = prices.idle_fee_cap ? `, max ${Money.format(prices.idle_fee_cap, currency)}` : '';
    const price = TariffSummary.price(String(idle), currency);
    return { text: `${price} per min${cap}`, amount: idle };
  }

  private static moneySide(amount: number | null, currency: string): Side {
    return amount ? { text: Money.format(amount, currency), amount } : { text: 'None', amount: 0 };
  }

  private static bandNamed(prices: TariffPrices | null, name: string): TariffBand | undefined {
    return prices?.bands.find((band) => band.name === name);
  }
}
