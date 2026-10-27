import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { Session } from '../../core/api/models/session';
import { SessionsApiService } from '../../core/api/sessions-api.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';

/** The newest charges with a driver's cards, linking to the sessions list for the rest. */
@Component({
  selector: 'ww-driver-charges',
  imports: [
    DatePipe,
    DecimalPipe,
    EmptyStateComponent,
    MatButtonModule,
    MatTableModule,
    MoneyPipe,
    RouterLink,
    StatusChipComponent,
  ],
  template: `
    <section class="ww-card" aria-labelledby="charges-title">
      <div class="ww-card-head line">
        <div class="titles"><h2 id="charges-title">Recent charges</h2></div>
        <a
          mat-button
          class="ww-small"
          routerLink="/sessions"
          [queryParams]="{ driver_id: driverId() }"
          data-testid="driver-all-sessions"
        >
          All sessions
        </a>
      </div>
      <div class="ww-card-body flush">
        @if (sessions().length === 0) {
          <ww-empty-state icon="zap" heading="No charge with this driver's cards yet" />
        } @else {
          <table mat-table [dataSource]="sessions()" data-testid="driver-sessions">
            <ng-container matColumnDef="started_at">
              <th mat-header-cell *matHeaderCellDef>Started</th>
              <td mat-cell *matCellDef="let session">
                <a [routerLink]="['/sessions', session.id]">{{
                  session.started_at | date: 'd MMM, HH:mm'
                }}</a>
              </td>
            </ng-container>
            <ng-container matColumnDef="where">
              <th mat-header-cell *matHeaderCellDef>Where</th>
              <td mat-cell *matCellDef="let session">
                <div class="ww-two">
                  {{ session.site_name }} · {{ session.connector_label }}
                  <span class="mono">{{ session.charger_identity }}</span>
                </div>
              </td>
            </ng-container>
            <ng-container matColumnDef="energy">
              <th mat-header-cell *matHeaderCellDef class="ww-num">Energy</th>
              <td mat-cell *matCellDef="let session" class="ww-num">
                {{ session.energy_wh / 1000 | number: '1.1-1' }} kWh
              </td>
            </ng-container>
            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef class="ww-num">Amount</th>
              <td mat-cell *matCellDef="let session" class="ww-num">
                {{ session.gross_amount | money: session.currency }}
              </td>
            </ng-container>
            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let session">
                <ww-status-chip kind="session" [status]="session.status" />
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="columns"></tr>
            <tr mat-row *matRowDef="let row; columns: columns"></tr>
          </table>
        }
      </div>
    </section>
  `,
})
export class DriverChargesComponent implements OnInit {
  static readonly SHOWN = 5;

  readonly driverId = input.required<string>();
  private readonly sessionsApi = inject(SessionsApiService);

  protected readonly sessions = signal<Session[]>([]);
  protected readonly columns = ['started_at', 'where', 'energy', 'amount', 'status'];

  ngOnInit(): void {
    firstValueFrom(this.sessionsApi.list({ driver_id: this.driverId() }))
      .then((page) => this.sessions.set(page.items.slice(0, DriverChargesComponent.SHOWN)))
      .catch(() => this.sessions.set([]));
  }
}
