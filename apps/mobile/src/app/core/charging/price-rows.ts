import { Money, PublicTariff, TariffBand } from '@wattwisely/driver-core';

/** One line of the price card: what is charged and how much. */
export interface PriceRow {
  label: string;
  value: string;
}

/**
 * The plug's prices as the design's price card lists them (Figma 9, "Plug details"): the
 * energy price in force now and until when, the other bands, the time and start fees when
 * there are any, and the idle fee. The estimate is the energy for 30 kWh at today's price.
 */
export class PriceRows {
  static readonly ESTIMATE_KWH = 30;

  static of(tariff: PublicTariff): PriceRow[] {
    const current = PriceRows.current(tariff);
    const currency = tariff.currency;
    const rows: PriceRow[] = [];
    if (current) {
      rows.push({ label: PriceRows.nowLabel(current), value: PriceRows.perKwh(current, currency) });
    }
    for (const band of PriceRows.others(tariff, current)) {
      rows.push({ label: PriceRows.bandLabel(band), value: PriceRows.perKwh(band, currency) });
    }
    if (current && Number(current.time_price_per_hour) > 0) {
      const value = `${Money.unitPrice(current.time_price_per_hour, currency)} per hour`;
      rows.push({ label: 'Charging time', value });
    }
    if (tariff.start_fee > 0) {
      rows.push({ label: 'Start fee', value: Money.format(tariff.start_fee, currency) });
    }
    const idle = PriceRows.idle(tariff, current);
    return idle ? [...rows, idle] : rows;
  }

  /** "about €13.50": 30 kWh at the energy price in force now, with the start fee. */
  static estimate(tariff: PublicTariff): string | null {
    const current = PriceRows.current(tariff);
    if (!current) {
      return null;
    }
    const major = Number(current.energy_price_per_kwh) * PriceRows.ESTIMATE_KWH;
    const minor = Math.round(major * 10 ** Money.decimals(tariff.currency)) + tariff.start_fee;
    return `about ${Money.format(minor, tariff.currency)}`;
  }

  static current(tariff: PublicTariff): TariffBand | null {
    return (
      tariff.bands.find((band) => band.name === tariff.current_band) ?? tariff.bands[0] ?? null
    );
  }

  /** "Energy now (peak until 21:00)", or "Energy" when one price holds all day. */
  private static nowLabel(band: TariffBand): string {
    return PriceRows.isAllDay(band) ? 'Energy' : `Energy now (${band.name} until ${band.end})`;
  }

  /** "Off-peak from 21:00", with the days when the band does not run every day. */
  private static bandLabel(band: TariffBand): string {
    const name = band.name.charAt(0).toUpperCase() + band.name.slice(1);
    const days = band.days.length === 7 ? '' : ` ${band.days.join(', ')}`;
    return `${name}${days} from ${band.start}`;
  }

  /** Each other price once, by its name and energy price; the band that comes next first. */
  private static others(tariff: PublicTariff, current: TariffBand | null): TariffBand[] {
    const seen = new Set<string>([current ? PriceRows.key(current) : '']);
    const isNext = (band: TariffBand) => (band.start === current?.end ? 0 : 1);
    const ordered = [...tariff.bands].sort((a, b) => isNext(a) - isNext(b));
    return ordered.filter((band) => {
      const key = PriceRows.key(band);
      const isNew = !seen.has(key) && band.name !== current?.name;
      seen.add(key);
      return isNew;
    });
  }

  private static idle(tariff: PublicTariff, current: TariffBand | null): PriceRow | null {
    const perMinute = current?.idle_fee_per_minute ?? '0';
    if (Number(perMinute) <= 0) {
      return null;
    }
    const cap =
      tariff.idle_fee_cap === null
        ? ''
        : `, cap ${Money.format(tariff.idle_fee_cap, tariff.currency)}`;
    return {
      label: `Idle fee after ${tariff.idle_grace_minutes} min`,
      value: `${Money.unitPrice(perMinute, tariff.currency)} per min${cap}`,
    };
  }

  private static perKwh(band: TariffBand, currency: string): string {
    return `${Money.unitPrice(band.energy_price_per_kwh, currency)} per kWh`;
  }

  private static key(band: TariffBand): string {
    return `${band.name}:${band.energy_price_per_kwh}`;
  }

  private static isAllDay(band: TariffBand): boolean {
    return band.start === '00:00' && band.end === '24:00';
  }
}
