import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { TariffProposal } from '../../../core/api/models/tariff-proposal';
import { TariffProposalsApiService } from '../../../core/api/tariff-proposals-api.service';
import { StatusChipComponent } from '../../../shared/status-chip.component';
import { ProposalReviewComponent } from './proposal-review.component';

/** Tariffs, Proposals: what the managed team proposed, waiting or decided (story MGT-03). */
@Component({
  selector: 'ww-tariff-proposals',
  imports: [
    DatePipe,
    EmptyStateComponent,
    MatTableModule,
    PageHeaderComponent,
    ProposalReviewComponent,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './tariff-proposals.component.html',
  styleUrl: './tariff-proposals.component.scss',
})
export class TariffProposalsComponent implements OnInit {
  private readonly proposalsApi = inject(TariffProposalsApiService);

  protected readonly columns = ['name', 'proposed', 'status', 'decided'];
  protected readonly proposals = signal<TariffProposal[]>([]);
  protected readonly scope = signal<'open' | 'decided'>('open');
  protected readonly error = signal('');
  protected readonly waiting = computed(() =>
    this.proposals().filter((proposal) => proposal.status === 'proposed'),
  );
  protected readonly decided = computed(() =>
    this.proposals().filter((proposal) => proposal.status !== 'proposed'),
  );

  ngOnInit(): void {
    void this.load();
  }

  protected async load(): Promise<void> {
    try {
      this.proposals.set(await firstValueFrom(this.proposalsApi.list()));
      this.error.set('');
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
