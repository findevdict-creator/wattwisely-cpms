import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { TariffProposal } from '../../../core/api/models/tariff-proposal';
import { TariffProposalsApiService } from '../../../core/api/tariff-proposals-api.service';
import { ProposalBandsComponent } from './proposal-bands.component';
import { ProposalPricesComponent } from './proposal-prices.component';
import { ProposalReviewComponent } from './proposal-review.component';

/** One proposed tariff change: the prices next to those in force, and the Owner's decision. */
@Component({
  selector: 'ww-tariff-proposal',
  imports: [
    MatButtonModule,
    MatIconModule,
    PageHeaderComponent,
    ProposalBandsComponent,
    ProposalPricesComponent,
    ProposalReviewComponent,
    RouterLink,
  ],
  templateUrl: './tariff-proposal.component.html',
  styles: `
    ww-proposal-bands {
      display: block;
      margin-top: 24px;
    }
  `,
})
export class TariffProposalComponent implements OnInit {
  readonly id = input.required<string>();
  private readonly proposalsApi = inject(TariffProposalsApiService);

  protected readonly proposal = signal<TariffProposal | null>(null);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.proposal.set(await firstValueFrom(this.proposalsApi.get(this.id())));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
