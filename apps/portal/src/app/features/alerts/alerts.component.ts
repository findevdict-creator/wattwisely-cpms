import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { AlertsApiService } from '../../core/api/alerts-api.service';
import { ApiProblem } from '../../core/api/api-problem';
import { Alert, AlertStatus, AlertSummary, AlertTypeLabels } from '../../core/api/models/alert';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { AlertBadgeService } from '../../layout/alert-badge.service';
import { DayLabel } from '../../shared/day-label';
import { AcknowledgeDialogComponent } from './acknowledge-dialog.component';
import { AlertRoutingSummary, RoutingLine } from './alert-routing-summary';
import { AlertSeverity } from './alert-severity';

/**
 * Alerts (story NTF-04): what is wrong with the chargers at one's sites, in Open,
 * Acknowledged and Closed tabs, newest first, and who hears about each kind. The platform
 * opens and closes alerts by itself; people acknowledge them with a note.
 */
@Component({
  selector: 'ww-alerts',
  imports: [
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    PageHeaderComponent,
    RouterLink,
  ],
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.scss',
})
export class AlertsComponent implements OnInit {
  static readonly EMPTY: Record<AlertStatus, { heading: string; text: string }> = {
    open: {
      heading: 'Nothing needs attention right now.',
      text: 'New problems show up here first.',
    },
    acknowledged: { heading: 'No alerts are being worked on.', text: '' },
    closed: { heading: 'No closed alerts yet.', text: '' },
  };

  private readonly alertsApi = inject(AlertsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly badge = inject(AlertBadgeService);
  protected readonly permissions = inject(PermissionsService);

  protected readonly columns = ['raised', 'alert', 'charger', 'site', 'severity', 'state'];
  protected readonly routingColumns = ['label', 'sentTo', 'sites', 'channels'];
  protected readonly tabs: { status: AlertStatus; label: string }[] = [
    { status: 'open', label: 'Open' },
    { status: 'acknowledged', label: 'Acknowledged' },
    { status: 'closed', label: 'Closed' },
  ];
  protected readonly status = signal<AlertStatus>('open');
  protected readonly alerts = signal<Alert[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly summary = signal<AlertSummary | null>(null);
  protected readonly routing = signal<RoutingLine[]>([]);
  protected readonly error = signal('');
  protected readonly isLoading = signal(true);
  protected readonly empty = computed(() => AlertsComponent.EMPTY[this.status()]);
  protected readonly days = DayLabel;
  protected readonly severity = AlertSeverity;

  async ngOnInit(): Promise<void> {
    void this.loadSummary();
    void this.loadRouting();
    await this.loadMore();
  }

  protected async show(status: AlertStatus): Promise<void> {
    this.status.set(status);
    this.alerts.set([]);
    this.nextCursor.set(null);
    this.isLoading.set(true);
    await this.loadMore();
  }

  protected async loadMore(): Promise<void> {
    try {
      const page = await firstValueFrom(this.alertsApi.list(this.status(), this.nextCursor()));
      this.alerts.update((alerts) => [...alerts, ...page.items]);
      this.nextCursor.set(page.next_cursor);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected count(status: AlertStatus): number | null {
    const summary = this.summary();
    return summary && status !== 'closed' ? summary[status] : null;
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
      void this.loadSummary();
    }
  }

  private async loadSummary(): Promise<void> {
    try {
      this.summary.set(await firstValueFrom(this.alertsApi.summary()));
    } catch {
      // The tabs show no counts; the list still works.
    }
  }

  /** Who hears about what, for people who may see Settings, Alert routing. */
  private async loadRouting(): Promise<void> {
    if (!this.permissions.can('settings:read')) {
      return;
    }
    try {
      this.routing.set(AlertRoutingSummary.lines(await firstValueFrom(this.alertsApi.rules())));
    } catch {
      // The summary is a convenience; Settings, Alert routing has the full picture.
    }
  }
}
