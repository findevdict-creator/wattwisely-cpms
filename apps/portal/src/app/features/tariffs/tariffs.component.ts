import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Tariff } from '../../core/api/models/tariff';
import { TariffProposalsApiService } from '../../core/api/tariff-proposals-api.service';
import { TariffsApiService } from '../../core/api/tariffs-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { SummaryLine, TariffSummary } from './tariff-summary';

/** Tariffs: what charging costs, with the prices in force and the sites that use each one. */
@Component({
  selector: 'ww-tariffs',
  imports: [
    DatePipe,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    PageHeaderComponent,
    RouterLink,
  ],
  templateUrl: './tariffs.component.html',
  styleUrl: './tariffs.component.scss',
})
export class TariffsComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly tariffsApi = inject(TariffsApiService);
  private readonly proposalsApi = inject(TariffProposalsApiService);

  protected readonly columns = [
    'name',
    'prices',
    'time',
    'start_fee',
    'sites',
    'version',
    'actions',
  ];
  /** How many proposals of the managed team wait for a decision. */
  protected readonly waiting = signal(0);
  protected readonly tariffs = signal<Tariff[]>([]);
  protected readonly status = signal<'active' | 'archived'>('active');
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
    if (this.permissions.managedService()) {
      firstValueFrom(this.proposalsApi.list('proposed'))
        .then((proposals) => this.waiting.set(proposals.length))
        .catch(() => this.waiting.set(0));
    }
  }

  protected async show(status: 'active' | 'archived'): Promise<void> {
    this.status.set(status);
    await this.load();
  }

  protected taxLineOf(tariff: Tariff): string {
    return TariffSummary.taxLine(tariff);
  }

  protected energyOf(tariff: Tariff): SummaryLine {
    return TariffSummary.energy(tariff.current_version, tariff.currency);
  }

  protected timeOf(tariff: Tariff): string {
    return TariffSummary.timeAndIdle(tariff.current_version, tariff.currency);
  }

  protected startFeeOf(tariff: Tariff): string {
    return TariffSummary.startFee(tariff.current_version, tariff.currency);
  }

  private async load(): Promise<void> {
    try {
      this.tariffs.set((await firstValueFrom(this.tariffsApi.list(this.status()))).items);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
