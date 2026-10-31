import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { AlertsApiService } from '../../core/api/alerts-api.service';
import { ApiProblem } from '../../core/api/api-problem';
import { ChargersApiService } from '../../core/api/chargers-api.service';
import { Alert, AlertTypeLabels } from '../../core/api/models/alert';
import { Charger, Connector } from '../../core/api/models/charger';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { AlertBadgeService } from '../../layout/alert-badge.service';
import { PageTitleService } from '../../layout/page-title.service';
import { DayLabel } from '../../shared/day-label';
import { Initials } from '../../shared/initials';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { ConnectorDialogComponent } from '../chargers/connector-dialog.component';
import { AcknowledgeDialogComponent } from './acknowledge-dialog.component';
import { AlertTimeline } from './alert-timeline';

/**
 * One alert, /alerts/{id}, the link in alert e-mails and notifications (story NTF-04): what
 * happened, its timeline, the charger it is about, and who is on it.
 */
@Component({
  selector: 'ww-alert',
  imports: [MatButtonModule, MatIconModule, PageHeaderComponent, RouterLink, StatusChipComponent],
  templateUrl: './alert.component.html',
  styleUrl: './alert.component.scss',
})
export class AlertComponent implements OnInit {
  static readonly STATES = {
    open: { tone: 'danger', label: 'Open' },
    acknowledged: { tone: 'warn', label: 'Acknowledged' },
    closed: { tone: 'ok', label: 'Cleared' },
  };

  readonly id = input.required<string>();

  private readonly alertsApi = inject(AlertsApiService);
  private readonly chargersApi = inject(ChargersApiService);
  private readonly dialog = inject(MatDialog);
  private readonly badge = inject(AlertBadgeService);
  private readonly pageTitle = inject(PageTitleService);
  protected readonly permissions = inject(PermissionsService);

  protected readonly alert = signal<Alert | null>(null);
  protected readonly charger = signal<Charger | null>(null);
  protected readonly error = signal('');
  protected readonly days = DayLabel;
  protected readonly states = AlertComponent.STATES;
  protected readonly timeline = computed(() => {
    const alert = this.alert();
    return alert ? AlertTimeline.of(alert) : [];
  });
  protected readonly connector = computed(() =>
    this.charger()?.connectors.find((connector) => connector.id === this.alert()?.connector_id),
  );

  async ngOnInit(): Promise<void> {
    try {
      const alert = await firstValueFrom(this.alertsApi.get(this.id()));
      this.alert.set(alert);
      this.pageTitle.set(alert.title);
      await this.loadCharger(alert);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected initials(name: string | null): string {
    return Initials.of(name ?? '?');
  }

  /** "faulted" for a connector's status. */
  protected statusWord(status: string): string {
    return StatusLabels.connector(status).toLowerCase();
  }

  protected label(alert: Alert): string {
    return AlertTypeLabels.LABELS[alert.type];
  }

  /** "A · Type 2 · 22 kW". */
  protected describe(connector: Connector): string {
    const type = ConnectorDialogComponent.TYPES.find((option) => option.value === connector.type);
    const power = connector.max_power_kw ? `${connector.max_power_kw} kW` : '';
    return [connector.label, type?.label ?? '', power].filter((part) => part !== '').join(' · ');
  }

  protected async acknowledge(alert: Alert): Promise<void> {
    const ref = this.dialog.open(AcknowledgeDialogComponent, { data: alert, width: '480px' });
    const saved = await firstValueFrom(ref.afterClosed());
    if (saved) {
      this.alert.set(saved);
      void this.badge.refresh();
    }
  }

  private async loadCharger(alert: Alert): Promise<void> {
    if (!this.permissions.can('chargers:read')) {
      return;
    }
    try {
      this.charger.set(await firstValueFrom(this.chargersApi.get(alert.charger_id)));
    } catch {
      // The alert still says which charger; the card about it stays away.
    }
  }
}
