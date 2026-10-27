import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriversApiService } from '../../core/api/drivers-api.service';
import {
  DriverDetail,
  DriverPaymentMode,
  RfidCard,
  RfidCardStatus,
} from '../../core/api/models/driver';
import { Session } from '../../core/api/models/session';
import { SessionsApiService } from '../../core/api/sessions-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { PaymentModeLabels } from '../../shared/payment-mode-labels';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { BlockDriverDialogComponent } from './block-driver-dialog.component';
import { CardDialogComponent } from './card-dialog.component';
import { DriverAccountCardComponent } from './driver-account-card.component';
import { DriverDialogComponent } from './driver-dialog.component';

/**
 * One driver: their details, cards, groups and recent charges (stories DRV-01 to DRV-03), what
 * they pay and their own login (module 19).
 */
@Component({
  selector: 'ww-driver',
  imports: [
    DatePipe,
    DriverAccountCardComponent,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    MoneyPipe,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './driver.component.html',
  styleUrl: './driver.component.scss',
})
export class DriverComponent implements OnInit {
  readonly id = input.required<string>();
  protected readonly permissions = inject(PermissionsService);
  private readonly driversApi = inject(DriversApiService);
  private readonly sessionsApi = inject(SessionsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly driver = signal<DriverDetail | null>(null);
  protected readonly sessions = signal<Session[]>([]);
  protected readonly error = signal('');
  protected readonly cardColumns = [
    'id_tag',
    'label',
    'status',
    'payment',
    'expires',
    'last_used',
    'actions',
  ];
  protected readonly paymentModes: DriverPaymentMode[] = ['inherit', 'pay', 'free'];
  protected readonly sessionColumns = ['started_at', 'where', 'status', 'energy', 'amount'];

  ngOnInit(): void {
    void this.load();
  }

  protected async edit(): Promise<void> {
    const dialog = this.dialog.open(DriverDialogComponent, { data: this.driver(), width: '640px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.tell('Driver saved.');
      await this.load();
    }
  }

  protected async addCard(): Promise<void> {
    const dialog = this.dialog.open(CardDialogComponent, { data: this.id(), width: '480px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.tell('Card registered.');
      await this.load();
    }
  }

  protected async setCardStatus(card: RfidCard, status: RfidCardStatus): Promise<void> {
    try {
      await firstValueFrom(this.driversApi.setCardStatus(card, status));
      this.tell(`Card ${card.id_tag} is now ${status}.`);
      await this.load();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  protected async setCardPaymentMode(card: RfidCard, mode: DriverPaymentMode): Promise<void> {
    try {
      await firstValueFrom(this.driversApi.setCardPaymentMode(card, mode));
      this.tell(`Card ${card.id_tag}: ${PaymentModeLabels.card(mode).toLowerCase()}.`);
      await this.load();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  protected driverPaymentLabel(mode: string): string {
    return PaymentModeLabels.driver(mode);
  }

  protected cardPaymentLabel(mode: string): string {
    return PaymentModeLabels.card(mode);
  }

  protected async block(): Promise<void> {
    const dialog = this.dialog.open(BlockDriverDialogComponent, {
      data: this.driver(),
      width: '480px',
    });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.tell('Driver blocked. Their cards are refused at every charger.');
      await this.load();
    }
  }

  protected async unblock(): Promise<void> {
    try {
      await firstValueFrom(this.driversApi.unblock(this.driver() as DriverDetail));
      this.tell('Driver unblocked.');
      await this.load();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  protected async remove(): Promise<void> {
    const driver = this.driver() as DriverDetail;
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Delete ${driver.name}?`,
        message:
          'Their cards stop working and they leave every access group. Past charges keep their name.',
        confirmLabel: 'Delete driver',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) !== true) {
      return;
    }
    try {
      await firstValueFrom(this.driversApi.remove(driver), { defaultValue: undefined });
      this.tell(`${driver.name} deleted.`);
      await this.router.navigate(['/drivers']);
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  protected async load(): Promise<void> {
    try {
      this.driver.set(await firstValueFrom(this.driversApi.get(this.id())));
      if (this.permissions.can('sessions:read')) {
        const page = await firstValueFrom(this.sessionsApi.list({ driver_id: this.id() }));
        this.sessions.set(page.items);
      }
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  private tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }
}
