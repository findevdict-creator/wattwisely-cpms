import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { TariffProposal } from '../../../core/api/models/tariff-proposal';
import { TariffProposalsApiService } from '../../../core/api/tariff-proposals-api.service';
import { StatusChipComponent } from '../../../shared/status-chip.component';

/** Tariffs, Proposed changes: what Wattwisely proposed and what became of it (story MGT-03). */
@Component({
  selector: 'ww-tariff-proposals',
  imports: [
    DatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTableModule,
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
  protected readonly scope = signal<'open' | 'all'>('open');
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected async show(scope: 'open' | 'all'): Promise<void> {
    this.scope.set(scope);
    await this.load();
  }

  private async load(): Promise<void> {
    const status = this.scope() === 'open' ? 'proposed' : undefined;
    try {
      this.proposals.set(await firstValueFrom(this.proposalsApi.list(status)));
      this.error.set('');
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
