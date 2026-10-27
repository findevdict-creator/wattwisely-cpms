import { Component, computed, input } from '@angular/core';
import { PublicTariff, TariffBand } from '../../core/api/models/place';
import { Money } from '../../shared/money';
import { MoneyPipe } from '../../shared/money.pipe';
import { UnitPricePipe } from '../../shared/unit-price.pipe';

/**
 * The prices at a plug, the way a price sign would show them: each band, with the one in force
 * marked, then the fees and the tax.
 */
@Component({
  selector: 'ww-tariff-summary',
  imports: [MoneyPipe, UnitPricePipe],
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
  protected readonly idleFeePerMinute = computed(
    () => this.currentBand()?.idle_fee_per_minute ?? this.tariff().bands[0]?.idle_fee_per_minute,
  );
  /** "23" from "23.00", "13.5" from "13.50". */
  protected readonly taxRate = computed(() => String(Number(this.tariff().tax_rate)));

  /** "After 15 min once charging has finished, at most €15.00". */
  protected readonly idleTerms = computed(() => {
    const tariff = this.tariff();
    const after = `After ${tariff.idle_grace_minutes} min once charging has finished`;
    return tariff.idle_fee_cap === null
      ? after
      : `${after}, at most ${Money.format(tariff.idle_fee_cap, tariff.currency)}`;
  });

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
