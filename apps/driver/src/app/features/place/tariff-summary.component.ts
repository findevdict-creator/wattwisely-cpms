import { Component, computed, input } from '@angular/core';
import { PublicTariff, TariffBand } from '../../core/api/models/place';
import { MoneyPipe } from '../../shared/money.pipe';

/** The prices at a plug, the way a price sign would show them: now, then the rest. */
@Component({
  selector: 'ww-tariff-summary',
  imports: [MoneyPipe],
  templateUrl: './tariff-summary.component.html',
  styleUrl: './tariff-summary.component.scss',
})
export class TariffSummaryComponent {
  static readonly DAY_WORDS: Record<string, string> = {
    mon: 'Mon',
    tue: 'Tue',
    wed: 'Wed',
    thu: 'Thu',
    fri: 'Fri',
    sat: 'Sat',
    sun: 'Sun',
  };

  readonly tariff = input.required<PublicTariff>();

  protected readonly currentBand = computed(
    () => this.tariff().bands.find((band) => band.name === this.tariff().current_band) ?? null,
  );
  protected readonly otherBands = computed(() =>
    this.tariff().bands.filter((band) => band !== this.currentBand()),
  );
  protected readonly idleFeePerMinute = computed(
    () => this.currentBand()?.idle_fee_per_minute ?? this.tariff().bands[0]?.idle_fee_per_minute,
  );

  /** "0.40" from "0.4000": prices are shown with the currency's usual decimals, trailing zeros dropped past two. */
  protected price(decimal: string): string {
    const [whole, fraction = ''] = decimal.split('.');
    const trimmed = fraction.replace(/0+$/, '');
    return `${whole}.${trimmed.padEnd(2, '0')}`;
  }

  protected isCharged(decimal: string): boolean {
    return Number(decimal) > 0;
  }

  /** "Mon–Fri 17:00–24:00", or "Every day" when the band covers the week. */
  protected when(band: TariffBand): string {
    const days =
      band.days.length === 7
        ? 'Every day'
        : band.days.map((day) => TariffSummaryComponent.DAY_WORDS[day] ?? day).join(', ');
    const isAllDay = band.start === '00:00' && band.end === '24:00';
    return isAllDay ? days : `${days} ${band.start}–${band.end}`;
  }
}
