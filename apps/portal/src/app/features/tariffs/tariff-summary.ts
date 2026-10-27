import { Tariff, TariffBand, TariffPrices } from '../../core/api/models/tariff';
import { Money } from '../../shared/money';

/** A line and the smaller line under it, for a two-line table cell. */
export interface SummaryLine {
  main: string;
  foot: string;
}

/** A tariff's prices in the words of the tariffs list: "£0.40 per kWh", "Idle £0.10 per min". */
export class TariffSummary {
  /** "GBP · VAT 20% included" */
  static taxLine(tariff: Tariff): string {
    const prices = tariff.current_version;
    const rate = Number(prices.tax_rate);
    const tax = `VAT ${rate}% ${prices.is_tax_included ? 'included' : 'added'}`;
    return rate > 0 ? `${tariff.currency} · ${tax}` : `${tariff.currency} · no VAT`;
  }

  /** The dearest energy price over the others, or "Free" when no band charges for energy. */
  static energy(prices: TariffPrices, currency: string): SummaryLine {
    const bands = [...prices.bands].sort(
      (a, b) => Number(b.energy_price_per_kwh) - Number(a.energy_price_per_kwh),
    );
    if (bands.length === 0 || Number(bands[0].energy_price_per_kwh) === 0) {
      return { main: 'Free', foot: 'No energy price' };
    }
    const [top, ...rest] = bands;
    const main = `${TariffSummary.price(top.energy_price_per_kwh, currency)} per kWh`;
    if (rest.length === 0) {
      return { main, foot: TariffSummary.when(top) };
    }
    const others = rest.map(
      (band) => `${TariffSummary.price(band.energy_price_per_kwh, currency)} ${band.name}`,
    );
    return { main: `${main} ${top.name}`, foot: others.join(', ') };
  }

  /** "£0.60 per hour · Idle £0.10 per min after 15 min, max £15.00", or "" for neither. */
  static timeAndIdle(prices: TariffPrices, currency: string): string {
    const hourly = Math.max(0, ...prices.bands.map((band) => Number(band.time_price_per_hour)));
    const idle = Math.max(0, ...prices.bands.map((band) => Number(band.idle_fee_per_minute)));
    const parts: string[] = [];
    if (hourly > 0) {
      parts.push(`${TariffSummary.price(String(hourly), currency)} per hour`);
    }
    if (idle > 0) {
      const cap = prices.idle_fee_cap ? `, max ${Money.format(prices.idle_fee_cap, currency)}` : '';
      const price = TariffSummary.price(String(idle), currency);
      parts.push(`Idle ${price} per min after ${prices.idle_grace_minutes} min${cap}`);
    }
    return parts.join(' · ');
  }

  /** "£1.00", or "" without a start fee. */
  static startFee(prices: TariffPrices, currency: string): string {
    return prices.start_fee > 0 ? Money.format(prices.start_fee, currency) : '';
  }

  /** A price typed as text ("0.385") with its currency sign and at least two decimals. */
  static price(text: string, currency: string): string {
    const format = new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
    return format.format(Number(text));
  }

  /** "All day", or "07:00–22:00", with the days when not every day. */
  private static when(band: TariffBand): string {
    const hours =
      band.start === '00:00' && band.end === '24:00' ? 'All day' : `${band.start}–${band.end}`;
    return band.days.length === 7 ? hours : `${hours}, ${band.days.length} days a week`;
  }
}
