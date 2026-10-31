import { Component, computed, input } from '@angular/core';
import { PublicTariff } from '@wattwisely/driver-core';
import { PriceRows } from '../../core/charging/price-rows';

/** The plug's price card (Figma 9, "Plug details"): each price, then the estimate for 30 kWh. */
@Component({
  selector: 'ww-price-card',
  template: `
    <h2>Price</h2>
    <dl class="ww-rows" data-testid="prices">
      @for (row of rows(); track row.label) {
        <div>
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      }
      @if (estimate(); as estimate) {
        <div class="total">
          <dt>Estimate for {{ kwh }} kWh</dt>
          <dd data-testid="estimate">{{ estimate }}</dd>
        </div>
      }
    </dl>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    h2 {
      margin: 0;
      font: 600 15px/20px var(--ww-font);
    }
  `,
  host: { class: 'ww-card' },
})
export class PriceCardComponent {
  readonly tariff = input.required<PublicTariff>();

  protected readonly kwh = PriceRows.ESTIMATE_KWH;
  protected readonly rows = computed(() => PriceRows.of(this.tariff()));
  protected readonly estimate = computed(() => PriceRows.estimate(this.tariff()));
}
