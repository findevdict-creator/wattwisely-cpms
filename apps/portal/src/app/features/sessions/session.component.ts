import { DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { StartSourceWords } from '../../shared/start-source-words';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { ZonedTimePipe } from '../../shared/zoned-time.pipe';
import { EnergyChartComponent } from './energy-chart.component';
import { ReceiptComponent } from './receipt.component';
import { SessionPaymentComponent } from './session-payment.component';
import { SessionStore } from './session.store';

/** One session: where and when, the receipt, the card payment, the energy chart and the timeline. */
@Component({
  selector: 'ww-session',
  imports: [
    DecimalPipe,
    EnergyChartComponent,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MoneyPipe,
    ReceiptComponent,
    RouterLink,
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
  protected readonly failureLabel = StatusLabels.failure;
  protected readonly stateLabel = StatusLabels.session;
  protected readonly startSource = StartSourceWords.of;

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
