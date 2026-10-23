import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { TariffProposal } from '../../../core/api/models/tariff-proposal';
import { TariffProposalsApiService } from '../../../core/api/tariff-proposals-api.service';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';
import { StatusChipComponent } from '../../../shared/status-chip.component';
import { ProposalDecisionDialogComponent } from './proposal-decision-dialog.component';
import { ProposalPricesComponent } from './proposal-prices.component';

/** One proposed tariff change: the prices, who proposed it, and the Owner's decision. */
@Component({
  selector: 'ww-tariff-proposal',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    ProposalPricesComponent,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './tariff-proposal.component.html',
  styleUrl: './tariff-proposal.component.scss',
})
export class TariffProposalComponent implements OnInit {
  readonly id = input.required<string>();
  protected readonly permissions = inject(PermissionsService);
  private readonly proposalsApi = inject(TariffProposalsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly proposal = signal<TariffProposal | null>(null);
  protected readonly error = signal('');
  protected readonly isBusy = signal(false);
  protected readonly isOpen = computed(() => this.proposal()?.status === 'proposed');
  protected readonly canDecide = computed(
    () => this.isOpen() && this.permissions.canChange('tariffs:approve'),
  );
  protected readonly canWithdraw = computed(
    () => this.isOpen() && this.permissions.canChange('tariffs:write'),
  );

  async ngOnInit(): Promise<void> {
    try {
      this.proposal.set(await firstValueFrom(this.proposalsApi.get(this.id())));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected async decide(decision: 'approve' | 'reject'): Promise<void> {
    const proposal = this.proposal() as TariffProposal;
    const dialog = this.dialog.open(ProposalDecisionDialogComponent, {
      data: { decision, name: proposal.name },
      width: '480px',
    });
    const comment: string | undefined = await firstValueFrom(dialog.afterClosed());
    if (comment === undefined) {
      return;
    }
    const call =
      decision === 'approve'
        ? () => this.proposalsApi.approve(proposal, comment)
        : () => this.proposalsApi.reject(proposal, comment);
    await this.change(
      call,
      decision === 'approve' ? 'Approved. The prices apply from now on.' : 'Rejected.',
    );
  }

  protected async withdraw(): Promise<void> {
    const proposal = this.proposal() as TariffProposal;
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Withdraw this proposal?',
        message: 'The Owner can no longer approve it. You can propose again later.',
        confirmLabel: 'Withdraw',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) === true) {
      await this.change(() => this.proposalsApi.withdraw(proposal), 'Withdrawn.');
    }
  }

  private async change(call: () => Observable<TariffProposal>, message: string): Promise<void> {
    this.isBusy.set(true);
    try {
      this.proposal.set(await firstValueFrom(call()));
      this.error.set('');
      this.snackBar.open(message, 'OK', { duration: 6000 });
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isBusy.set(false);
    }
  }
}
