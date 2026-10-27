import { Component, computed, input } from '@angular/core';
import { FormArray } from '@angular/forms';
import { TariffPrices } from '../../../core/api/models/tariff';
import { MoneyPipe } from '../../../shared/money.pipe';
import { TariffBandForm } from '../tariff-band-form';
import { TariffBandsComponent } from '../tariff-bands.component';

/** The prices of a proposal, read-only: the fees and the bands, in the editor's own table. */
@Component({
  selector: 'ww-proposal-prices',
  imports: [MoneyPipe, TariffBandsComponent],
  templateUrl: './proposal-prices.component.html',
  styles: `
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 8px 16px;
      max-width: 600px;
      margin: 0 0 16px;
    }
    dt {
      color: var(--mat-sys-on-surface-variant);
    }
    dd {
      margin: 0;
    }
  `,
})
export class ProposalPricesComponent {
  readonly prices = input.required<TariffPrices>();
  readonly currency = input.required<string>();

  protected readonly bands = computed(() => {
    const bands = new FormArray(this.prices().bands.map((band) => TariffBandForm.create(band)));
    bands.disable();
    return bands;
  });
}
