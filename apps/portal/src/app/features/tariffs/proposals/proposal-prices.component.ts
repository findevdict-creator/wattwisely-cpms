import { DecimalPipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { TariffPrices } from '../../../core/api/models/tariff';
import { MoneyPipe } from '../../../shared/money.pipe';

/** The fees and limits of a proposal, read-only: tax, start fee, minimum, maximum and idle. */
@Component({
  selector: 'ww-proposal-prices',
  imports: [DecimalPipe, MoneyPipe],
  templateUrl: './proposal-prices.component.html',
})
export class ProposalPricesComponent {
  readonly prices = input.required<TariffPrices>();
  readonly currency = input.required<string>();
}
