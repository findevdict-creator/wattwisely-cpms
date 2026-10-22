import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CommandsApiService } from '../../core/api/commands-api.service';
import { Charger, Connector } from '../../core/api/models/charger';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { ChargerActivityStore } from './charger-activity.store';

/** One connector on the charger page: its status, the running session, and the commands for it. */
@Component({
  selector: 'ww-connector-card',
  imports: [
    DecimalPipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MoneyPipe,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './connector-card.component.html',
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
