import { DatePipe } from '@angular/common';
import { Component, OnDestroy, OnInit, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { CommandsApiService } from '../../core/api/commands-api.service';
import { Charger, Connector } from '../../core/api/models/charger';
import { ChargerEvent } from '../../core/api/models/charger-event';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { ChargerActivityComponent } from './charger-activity.component';
import { ChargerActivityStore } from './charger-activity.store';
import { ChargerStore } from './charger.store';
import { ConnectorCardComponent } from './connector-card.component';
import { ConnectorDialogComponent } from './connector-dialog.component';
import { LiveEventApplier } from './live-event.applier';
import { EditChargerDialogComponent } from './edit-charger-dialog.component';
import { QrCodesDialogComponent } from './qr-codes-dialog.component';
import { SetupCardComponent } from './setup-card.component';

/**
 * One charger: what it is, how it connects, its connectors as they change live, and the
 * commands the platform can send it (stories AST-02, AST-03 and module 4).
 */
@Component({
  selector: 'ww-charger',
  imports: [
    ChargerActivityComponent,
    ConnectorCardComponent,
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    RouterLink,
    SetupCardComponent,
    StatusChipComponent,
  ],
  providers: [ChargerStore, ChargerActivityStore],
  templateUrl: './charger.component.html',
  styleUrl: './charger.component.scss',
})
export class ChargerComponent implements OnInit, OnDestroy {
  readonly id = input.required<string>();
  protected readonly store = inject(ChargerStore);
  protected readonly activity = inject(ChargerActivityStore);
  protected readonly permissions = inject(PermissionsService);
  private readonly commandsApi = inject(CommandsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  ngOnInit(): void {
    void this.store.load(this.id());
    void this.activity.start(this.id(), (event) => this.onLiveEvent(event));
  }

  ngOnDestroy(): void {
    this.activity.stop();
  }

  protected reset(type: 'soft' | 'hard'): void {
    void this.activity.send(this.commandsApi.reset(this.id(), type));
  }

  protected setAvailability(isOperative: boolean): void {
    void this.activity.send(this.commandsApi.changeAvailability(this.id(), null, isOperative));
  }

  protected async edit(): Promise<void> {
    const data = this.store.charger();
    const dialog = this.dialog.open(EditChargerDialogComponent, { data, width: '520px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.store.tell('Charger saved.');
      await this.store.load(this.id());
    }
  }

  protected async newPassword(): Promise<void> {
    const isConfirmed = await this.confirm({
      title: 'Set a new password?',
      message: 'The current one stops working as soon as the charger reconnects.',
      confirmLabel: 'Set new password',
    });
    if (isConfirmed) {
      await this.store.setPassword();
    }
  }

  protected async removePassword(): Promise<void> {
    const isConfirmed = await this.confirm({
      title: 'Remove the password?',
      message: 'The charger is then recognised only by what it reports at its first boot.',
      confirmLabel: 'Remove password',
    });
    if (isConfirmed) {
      await this.store.removePassword();
    }
  }

  protected async remove(): Promise<void> {
    const charger = this.store.charger() as Charger;
    const isConfirmed = await this.confirm({
      title: `Remove ${charger.ocpp_identity}?`,
      message: 'It can no longer connect. Past sessions stay. Its ID can be used again.',
      confirmLabel: 'Remove charger',
    });
    if (isConfirmed && (await this.store.remove())) {
      await this.router.navigate(['/chargers']);
    }
  }

  /** The stickers for the plugs (module 7). */
  protected showQrCodes(): void {
    this.dialog.open(QrCodesDialogComponent, { data: this.store.charger(), width: '640px' });
  }

  protected async editConnector(connector: Connector | null): Promise<void> {
    const charger = this.store.charger() as Charger;
    const nextNumber = Math.max(0, ...charger.connectors.map((c) => c.ocpp_connector_id)) + 1;
    const data = { chargerId: charger.id, connector, nextNumber };
    const dialog = this.dialog.open(ConnectorDialogComponent, { data, width: '420px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.store.tell(connector ? 'Connector saved.' : 'Connector added.');
      await this.store.load(this.id());
    }
  }

  protected async removeConnector(connector: Connector): Promise<void> {
    const isConfirmed = await this.confirm({
      title: `Remove connector ${connector.label}?`,
      message: 'Only a connector the charger has never reported can be removed.',
      confirmLabel: 'Remove connector',
    });
    if (isConfirmed) {
      await this.store.removeConnector(connector);
    }
  }

  private onLiveEvent(event: ChargerEvent): void {
    if (LiveEventApplier.needsReload(event)) {
      void this.store.load(this.id());
    } else {
      this.store.apply((charger) => LiveEventApplier.apply(charger, event));
    }
  }

  private async confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialog = this.dialog.open(ConfirmDialogComponent, { data });
    return (await firstValueFrom(dialog.afterClosed())) === true;
  }
}
