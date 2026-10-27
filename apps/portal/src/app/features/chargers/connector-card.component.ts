import { DecimalPipe, LowerCasePipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CommandsApiService } from '../../core/api/commands-api.service';
import { Charger, Connector } from '../../core/api/models/charger';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { DurationLabel } from '../../shared/duration-label';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { ChargerActivityStore } from './charger-activity.store';
import { PlugLabel } from './plug-label';

/** One connector on the charger page: its status, the running session, and the commands for it. */
@Component({
  selector: 'ww-connector-card',
  imports: [
    DecimalPipe,
    LowerCasePipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MoneyPipe,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './connector-card.component.html',
  styles: `
    .ww-card {
      height: 100%;
      box-sizing: border-box;
    }
    .ww-card-body {
      gap: 8px;
    }
    .energy {
      font-size: 20px;
      line-height: 28px;
      font-weight: 600;
    }
    .hint,
    .error {
      margin: 0;
    }
    .actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }
  `,
})
export class ConnectorCardComponent {
  static readonly STARTABLE = ['available', 'preparing', 'occupied', 'unknown'];
  /** A remote stop only makes sense while the transaction runs (not once it has stopped). */
  static readonly STOPPABLE = ['charging', 'suspended', 'idle'];

  readonly charger = input.required<Charger>();
  readonly connector = input.required<Connector>();
  readonly edit = output<Connector>();
  readonly remove = output<Connector>();

  protected readonly permissions = inject(PermissionsService);
  private readonly activity = inject(ChargerActivityStore);
  private readonly commandsApi = inject(CommandsApiService);

  protected readonly canCommand = computed(
    () => this.permissions.canChange('chargers:command') && this.charger().is_online,
  );
  protected readonly canStart = computed(
    () =>
      this.canCommand() &&
      !this.connector().active_session &&
      ConnectorCardComponent.STARTABLE.includes(this.connector().status),
  );
  protected readonly canStop = computed(
    () =>
      this.canCommand() &&
      ConnectorCardComponent.STOPPABLE.includes(this.connector().active_session?.status ?? ''),
  );
  protected readonly sessionLabel = computed(() =>
    StatusLabels.session(this.connector().active_session?.status ?? ''),
  );
  protected readonly energyKwh = computed(
    () => (this.connector().active_session?.energy_wh ?? 0) / 1000,
  );
  protected readonly plug = computed(() => {
    const connector = this.connector();
    const current = connector.current_type ? ` ${connector.current_type.toUpperCase()}` : '';
    return `${PlugLabel.of(connector)}${current}`;
  });
  protected readonly duration = computed(() =>
    DurationLabel.between(this.connector().active_session?.started_at ?? '', null),
  );
  /** What the connector is doing when no car charges on it. */
  protected readonly idleNote = computed(() => {
    const { status, status_changed_at: since } = this.connector();
    if (!this.charger().is_online) {
      return 'The charger is offline.';
    }
    const words = StatusLabels.connector(status);
    return since ? `${words} for ${DurationLabel.between(since, null)}` : words;
  });

  protected start(): void {
    void this.activity.send(this.commandsApi.remoteStart(this.charger().id, this.connector().id));
  }

  protected stop(): void {
    const session = this.connector().active_session;
    if (session) {
      void this.activity.send(this.commandsApi.remoteStop(this.charger().id, session.id));
    }
  }

  protected unlock(): void {
    void this.activity.send(this.commandsApi.unlock(this.charger().id, this.connector().id));
  }

  protected setAvailability(isOperative: boolean): void {
    void this.activity.send(
      this.commandsApi.changeAvailability(this.charger().id, this.connector().id, isOperative),
    );
  }
}
