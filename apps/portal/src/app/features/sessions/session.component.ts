import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { KpiCardComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { SessionDetail } from '../../core/api/models/session';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';
import { RefundDialogComponent } from '../payments/refund-dialog.component';
import { EnergyChartComponent } from './energy-chart.component';
import { ReceiptComponent } from './receipt.component';
import { SessionChargerComponent } from './session-charger.component';
import { SessionFigures } from './session-figures';
import { SessionPaymentComponent } from './session-payment.component';
import { SessionStore } from './session.store';

/**
 * One session: its figures, the energy chart, the timeline and the receipt, with the price, the
 * card payment and the charger beside them.
 */
@Component({
  selector: 'ww-session',
  imports: [
    EnergyChartComponent,
    KpiCardComponent,
    MatButtonModule,
    MatIconModule,
    MoneyPipe,
    PageHeaderComponent,
    ReceiptComponent,
    RouterLink,
    SessionChargerComponent,
    SessionPaymentComponent,
    StatusChipComponent,
    ZonedTimePipe,
  ],
  providers: [SessionStore],
  templateUrl: './session.component.html',
  styleUrl: './session.component.scss',
})
export class SessionComponent implements OnInit {
  readonly id = input.required<string>();
  protected readonly store = inject(SessionStore);
  protected readonly permissions = inject(PermissionsService);
  private readonly dialog = inject(MatDialog);

  protected readonly error = signal('');
  protected readonly flagLabel = StatusLabels.reviewFlag;
  protected readonly stateLabel = StatusLabels.session;
  protected readonly figures = computed(() => {
    const session = this.store.session() as SessionDetail;
    return {
      energy: SessionFigures.energy(session),
      duration: SessionFigures.duration(session),
      power: SessionFigures.power(session, this.store.readings()),
      total: SessionFigures.total(session),
    };
  });

  ngOnInit(): void {
    void this.start();
  }

  protected async close(): Promise<void> {
    const session = this.store.session();
    const isStopped = session?.status === 'stopping';
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Close this session?',
        message: isStopped
          ? 'It is priced now with the readings so far, as if the car had just left.'
          : 'The charger never reported the end. The session is marked failed and nobody is charged.',
        confirmLabel: 'Close session',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) !== true) {
      return;
    }
    try {
      await this.store.close(this.id());
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** "Session 8812", by the charger's transaction number when there is one. */
  protected titleOf(session: SessionDetail): string {
    return session.ocpp_transaction_id ? `Session ${session.ocpp_transaction_id}` : 'Session';
  }

  /** The dot in front of a step of the timeline. */
  protected toneOf(status: string): string {
    return ['idle', 'suspended'].includes(status) ? 'warn' : StatusLabels.toneOf(status);
  }

  protected canRefund(): boolean {
    const payment = this.store.session()?.payment;
    return (
      !!payment &&
      SessionPaymentComponent.REFUNDABLE.includes(payment.status) &&
      this.permissions.canChange('payments:refund')
    );
  }

  protected async refund(): Promise<void> {
    const data = this.store.session()?.payment;
    const dialog = this.dialog.open(RefundDialogComponent, { data, width: '480px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      await this.reload();
    }
  }

  protected async reload(): Promise<void> {
    try {
      await this.store.load(this.id());
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  private async start(): Promise<void> {
    try {
      await this.store.load(this.id());
      const session = this.store.session();
      if (session && !this.store.isEnded() && this.permissions.can('chargers:read')) {
        this.store.follow(session.id, session.charger_id);
      }
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
