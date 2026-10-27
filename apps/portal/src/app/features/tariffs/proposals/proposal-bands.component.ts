import { Component, computed, input } from '@angular/core';
import { FormArray } from '@angular/forms';
import { TariffPrices } from '../../../core/api/models/tariff';
import { TariffBandForm } from '../tariff-band-form';
import { TariffBandsComponent } from '../tariff-bands.component';

/** The time windows of a proposal, read-only, in the editor's own table. */
@Component({
  selector: 'ww-proposal-bands',
  imports: [TariffBandsComponent],
  template: `
    <section class="ww-card" aria-labelledby="bands-title">
      <div class="ww-card-head line">
        <div class="titles">
          <h2 id="bands-title">Time windows</h2>
          <p>As proposed; times are local to each site</p>
        </div>
      </div>
      <ww-tariff-bands [bands]="bands()" [currency]="currency()" [isEditable]="false" />
    </section>
  `,
})
export class ProposalBandsComponent {
  readonly prices = input.required<TariffPrices>();
  readonly currency = input.required<string>();

  protected readonly bands = computed(() => {
    const bands = new FormArray(this.prices().bands.map((band) => TariffBandForm.create(band)));
    bands.disable();
    return bands;
  });
}
