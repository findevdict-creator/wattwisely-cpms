import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { Observable, firstValueFrom } from 'rxjs';
import { CommandsApiService } from '../../core/api/commands-api.service';
import { Charger, Connector } from '../../core/api/models/charger';
import { ChargerCommand } from '../../core/api/models/command';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog.component';
import { ChargerActivityStore } from './charger-activity.store';
import { ChargerCommandRules } from './charger-command.rules';
import { OcppVersionLabel } from './ocpp-version-label';
import { PlugLabel } from './plug-label';

/**
 * The remote commands of a charger in one place (module 4): reset, availability, and start,
 * stop and unlock on a connector. Shown to whoever holds chargers:command at the charger's site;
 * the buttons stay visible while the charger is offline, with the reason they are off.
 */
@Component({
  selector: 'ww-charger-commands',
  imports: [MatButtonModule, MatFormFieldModule, MatIconModule, MatSelectModule],
  templateUrl: './charger-commands.component.html',
  styleUrl: './charger-commands.component.scss',
})
export class ChargerCommandsComponent {
  readonly charger = input.required<Charger>();
  /** A command was accepted by the API; its answer follows under the Commands tab. */
  readonly sent = output<void>();

  private readonly permissions = inject(PermissionsService);
  private readonly activity = inject(ChargerActivityStore);
  private readonly commandsApi = inject(CommandsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly pickedId = signal<string | null>(null);

  protected readonly connector = computed(() => {
    const connectors = this.charger().connectors;
    return connectors.find((item) => item.id === this.pickedId()) ?? connectors[0] ?? null;
  });
  protected readonly blockedReason = computed(() =>
    ChargerCommandRules.blockedReason(this.charger(), this.permissions.isReadOnly()),
  );
  protected readonly isBlocked = computed(() => this.blockedReason() !== null);
  protected readonly version = computed(() => OcppVersionLabel.of(this.charger().ocpp_version));
  protected readonly canStart = computed(
    () => !this.isBlocked() && ChargerCommandRules.canStart(this.connector()),
  );
  protected readonly canStop = computed(
    () => !this.isBlocked() && ChargerCommandRules.canStop(this.connector()),
  );
  protected readonly isOutOfService = computed(() => this.charger().status === 'unavailable');

  protected plugOf(connector: Connector): string {
    return PlugLabel.of(connector);
  }

  protected pick(connectorId: string): void {
    this.pickedId.set(connectorId);
  }

  protected restart(): void {
    this.send(this.commandsApi.reset(this.charger().id, 'soft'));
  }

  protected async reboot(): Promise<void> {
    const isConfirmed = await this.confirm({
      title: 'Reboot the charger?',
      message: 'It powers down and starts again. A charge in progress stops at once.',
      confirmLabel: 'Reboot',
    });
    if (isConfirmed) {
      this.send(this.commandsApi.reset(this.charger().id, 'hard'));
    }
  }

  protected async setAvailability(isOperative: boolean): Promise<void> {
    const isConfirmed =
      isOperative ||
      (await this.confirm({
        title: 'Take the charger out of service?',
        message: 'Drivers cannot start a charge on any connector until it is put back.',
        confirmLabel: 'Take out of service',
      }));
    if (isConfirmed) {
      this.send(this.commandsApi.changeAvailability(this.charger().id, null, isOperative));
    }
  }

  protected start(connector: Connector): void {
    this.send(this.commandsApi.remoteStart(this.charger().id, connector.id));
  }

  protected stop(connector: Connector): void {
    if (connector.active_session) {
      this.send(this.commandsApi.remoteStop(this.charger().id, connector.active_session.id));
    }
  }

  protected unlock(connector: Connector): void {
    this.send(this.commandsApi.unlock(this.charger().id, connector.id));
  }

  private send(request: Observable<ChargerCommand>): void {
    void this.activity.send(request).then((isSent) => isSent && this.sent.emit());
  }

  private async confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialog = this.dialog.open(ConfirmDialogComponent, { data });
    return (await firstValueFrom(dialog.afterClosed())) === true;
  }
}
