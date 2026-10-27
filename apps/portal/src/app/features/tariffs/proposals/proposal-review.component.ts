import {
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { Tariff } from '../../../core/api/models/tariff';
import { TariffProposal } from '../../../core/api/models/tariff-proposal';
import { TariffProposalsApiService } from '../../../core/api/tariff-proposals-api.service';
import { TariffsApiService } from '../../../core/api/tariffs-api.service';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';
import { DayLabel } from '../../../shared/day-label';
import { StatusChipComponent } from '../../../shared/status-chip.component';
import { ProposalComparison } from './proposal-comparison';
import { ProposalDecisionDialogComponent } from './proposal-decision-dialog.component';

/** A proposal as the Owner reviews it: the note, its prices next to those in force, the decision. */
@Component({
  selector: 'ww-proposal-review',
  imports: [MatButtonModule, MatIconModule, RouterLink, StatusChipComponent],
  templateUrl: './proposal-review.component.html',
  styleUrl: './proposal-review.component.scss',
})
export class ProposalReviewComponent {
  static readonly VERBS: Record<string, string> = {
    approved: 'Approved',
    rejected: 'Rejected',
    withdrawn: 'Withdrawn',
  };

  readonly proposal = input.required<TariffProposal>();
  readonly isLinked = input(false);
  readonly changed = output<TariffProposal>();
  protected readonly permissions = inject(PermissionsService);
  private readonly proposalsApi = inject(TariffProposalsApiService);
  private readonly tariffsApi = inject(TariffsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  /** The tariff as it is now, while the proposal waits; decided proposals compare with nothing. */
  protected readonly current = signal<Tariff | null>(null);
  protected readonly error = signal('');
  protected readonly isBusy = signal(false);
  protected readonly isOpen = computed(() => this.proposal().status === 'proposed');
  protected readonly canDecide = computed(
    () => this.isOpen() && this.permissions.canChange('tariffs:approve'),
  );
  protected readonly canWithdraw = computed(
    () => this.isOpen() && this.permissions.canChange('tariffs:write'),
  );
  protected readonly rows = computed(() =>
    ProposalComparison.rows(
      this.current()?.current_version ?? null,
      this.proposal().prices,
      this.proposal().currency,
    ),
  );
  protected readonly heading = computed(() => {
    const proposal = this.proposal();
    return proposal.tariff_id ? `New prices for ${proposal.name}` : `New tariff ${proposal.name}`;
  });
  protected readonly byline = computed(() => {
    const proposal = this.proposal();
    return `Proposed by ${proposal.proposed_by} · ${DayLabel.dayAndTime(proposal.proposed_at)}`;
  });
  protected readonly approveLabel = computed(() => {
    const tariff = this.current();
    if (!this.proposal().tariff_id) {
      return 'Approve and create the tariff';
    }
    return tariff ? `Approve and make version ${tariff.current_version.number + 1}` : 'Approve';
  });

  constructor() {
    effect(() => {
      const tariffId = this.isOpen() ? this.proposal().tariff_id : null;
      untracked(() => void this.loadCurrent(tariffId));
    });
  }

  /** "Approved by Olivia Hart, 26 Oct" */
  protected decisionOf(proposal: TariffProposal): string {
    const verb = ProposalReviewComponent.VERBS[proposal.status] ?? proposal.status;
    const when = proposal.decided_at ? DayLabel.day(proposal.decided_at) : '';
    return `${verb} by ${proposal.decided_by}, ${when}`;
  }

  protected async decide(decision: 'approve' | 'reject'): Promise<void> {
    const proposal = this.proposal();
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
    const proposal = this.proposal();
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
      this.changed.emit(await firstValueFrom(call()));
      this.error.set('');
      this.snackBar.open(message, 'OK', { duration: 6000 });
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isBusy.set(false);
    }
  }

  private async loadCurrent(tariffId: string | null): Promise<void> {
    if (!tariffId) {
      this.current.set(null);
      return;
    }
    try {
      this.current.set(await firstValueFrom(this.tariffsApi.get(tariffId)));
    } catch {
      this.current.set(null);
    }
  }
}
