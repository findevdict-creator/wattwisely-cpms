import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Router, RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriversApiService } from '../../core/api/drivers-api.service';
import { DriverDetail } from '../../core/api/models/driver';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { PaymentModeLabels } from '../../shared/payment-mode-labels';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { BlockDriverDialogComponent } from './block-driver-dialog.component';
import { DriverAccountCardComponent } from './driver-account-card.component';
import { DriverCardsComponent } from './driver-cards.component';
import { DriverChargesComponent } from './driver-charges.component';
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
    DriverCardsComponent,
    DriverChargesComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    PageHeaderComponent,
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
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);

  protected readonly driver = signal<DriverDetail | null>(null);
  protected readonly error = signal('');

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

  /** What the subtitle tells before the date: the e-mail and the reference, when there are. */
  protected factsOf(driver: DriverDetail): string[] {
    const email = driver.is_personal_data_hidden ? '' : (driver.email ?? '');
    return [email, driver.reference ? `reference ${driver.reference}` : ''].filter((part) => part);
  }

  protected driverPaymentLabel(mode: string): string {
    return PaymentModeLabels.driver(mode);
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
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  private tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }
}
