import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AlertsApiService } from '../../core/api/alerts-api.service';
import { ApiProblem } from '../../core/api/api-problem';
import { Alert, AlertStatus, AlertTypeLabels } from '../../core/api/models/alert';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { AlertBadgeService } from '../../layout/alert-badge.service';
import { AcknowledgeDialogComponent } from './acknowledge-dialog.component';

/**
 * Alerts (story NTF-04): what is wrong with the chargers at one's sites, in Open,
 * Acknowledged and Closed tabs, newest first. The platform opens and closes alerts by
 * itself; people acknowledge them with a note. /alerts/{id} opens on that alert's tab.
 */
@Component({
  selector: 'ww-alerts',
  imports: [
    DatePipe,
    MatButtonModule,
    MatButtonToggleModule,
    MatIconModule,
    MatTableModule,
    RouterLink,
  ],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss',
})
export class AlertsComponent implements OnInit {
  /** From the route /alerts/:id, e.g. a link in an e-mail. */
  readonly id = input<string>();

  private readonly alertsApi = inject(AlertsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly badge = inject(AlertBadgeService);
  protected readonly permissions = inject(PermissionsService);

  protected readonly columns = ['opened_at', 'alert', 'site', 'state', 'actions'];
  protected readonly status = signal<AlertStatus>('open');
  protected readonly alerts = signal<Alert[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    const id = this.id();
    if (id) {
      try {
        this.status.set((await firstValueFrom(this.alertsApi.get(id))).status);
      } catch (error) {
        this.error.set(ApiProblem.from(error).detail);
      }
    }
    await this.loadMore();
  }

  protected async show(status: AlertStatus): Promise<void> {
    this.status.set(status);
    this.alerts.set([]);
    this.nextCursor.set(null);
    await this.loadMore();
  }

  protected async loadMore(): Promise<void> {
    try {
      const page = await firstValueFrom(this.alertsApi.list(this.status(), this.nextCursor()));
      this.alerts.update((alerts) => [...alerts, ...page.items]);
      this.nextCursor.set(page.next_cursor);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected label(alert: Alert): string {
    return AlertTypeLabels.LABELS[alert.type];
  }

  protected async acknowledge(alert: Alert): Promise<void> {
    const ref = this.dialog.open(AcknowledgeDialogComponent, { data: alert, width: '480px' });
    const saved = await firstValueFrom(ref.afterClosed());
    if (saved) {
      this.alerts.update((alerts) => alerts.filter((candidate) => candidate.id !== saved.id));
      void this.badge.refresh();
    }
  }
}
