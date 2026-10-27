import { Component, input } from '@angular/core';
import { TariffForm } from './tariff-form';
import { TariffSummary } from './tariff-summary';

/** The prices on screen as a driver reads them on the connector page, before they are saved. */
@Component({
  selector: 'ww-tariff-driver-view',
  template: `
    <section class="ww-card" aria-labelledby="driver-view-title">
      <div class="ww-card-head">
        <div class="titles">
          <h2 id="driver-view-title">What drivers see</h2>
          <p>On the connector page and the receipt</p>
        </div>
      </div>
      <div class="ww-card-body">
        <div class="tile" data-testid="driver-view">
          <span class="ww-overline">{{ form().fields.controls.name.value || 'New tariff' }}</span>
          <b class="price">{{ energy() }}</b>
          <span class="words">{{ words() }}</span>
        </div>
      </div>
    </section>
  `,
  styles: `
    .tile {
      display: flex;
      flex-direction: column;
      gap: 4px;
      padding: 16px;
      border-radius: var(--ww-radius-md);
      background: var(--mat-sys-surface-container-low);
    }
    .price {
      font-size: 22px;
      line-height: 30px;
      font-weight: 600;
    }
    .words {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class TariffDriverViewComponent {
  readonly form = input.required<TariffForm>();

  protected energy(): string {
    return TariffSummary.energy(this.form().toPrices(), this.form().currency).main;
  }

  /** The other windows, the time and idle fees, and how tax is counted, as one sentence. */
  protected words(): string {
    const prices = this.form().toPrices();
    const currency = this.form().currency;
    const parts = [
      TariffSummary.energy(prices, currency).foot,
      TariffSummary.timeAndIdle(prices, currency),
      TariffSummary.startFee(prices, currency) &&
        `Start fee ${TariffSummary.startFee(prices, currency)}`,
      prices.is_tax_included ? 'Prices include VAT' : 'VAT is added',
    ];
    return `${parts.filter((part) => part).join('. ')}.`;
  }
}
