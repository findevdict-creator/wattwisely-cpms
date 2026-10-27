import { DatePipe } from '@angular/common';
import { Component, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { EmptyStateComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriversApiService } from '../../core/api/drivers-api.service';
import {
  DriverDetail,
  DriverPaymentMode,
  RfidCard,
  RfidCardStatus,
} from '../../core/api/models/driver';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { DurationLabel } from '../../shared/duration-label';
import { PaymentModeLabels } from '../../shared/payment-mode-labels';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { CardDialogComponent } from './card-dialog.component';

/**
 * A driver's RFID cards (story DRV-03) and who pays with each (module 19): add a card, block
 * it, report it lost or reactivate it. Tells the page when a card changed.
 */
@Component({
  selector: 'ww-driver-cards',
  imports: [
    DatePipe,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    StatusChipComponent,
  ],
  templateUrl: './driver-cards.component.html',
  styles: `
    .mat-mdc-header-cell,
    .mat-mdc-cell {
      white-space: nowrap;
    }
    .actions {
      width: 1%;
      text-align: right;
      white-space: nowrap;
    }
  `,
})
export class DriverCardsComponent {
  readonly driver = input.required<DriverDetail>();
  readonly changed = output<void>();

  protected readonly permissions = inject(PermissionsService);
  private readonly driversApi = inject(DriversApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly columns = ['card', 'payment', 'expires', 'last_used', 'status', 'actions'];
  protected readonly paymentModes: DriverPaymentMode[] = ['inherit', 'pay', 'free'];

  protected async addCard(): Promise<void> {
    const dialog = this.dialog.open(CardDialogComponent, {
      data: this.driver().id,
      width: '480px',
    });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.tell('Card registered.');
      this.changed.emit();
    }
  }

  protected async setCardStatus(card: RfidCard, status: RfidCardStatus): Promise<void> {
    await this.attempt(async () => {
      await firstValueFrom(this.driversApi.setCardStatus(card, status));
      this.tell(`Card ${card.id_tag} is now ${status}.`);
    });
  }

  protected async setCardPaymentMode(card: RfidCard, mode: DriverPaymentMode): Promise<void> {
    await this.attempt(async () => {
      await firstValueFrom(this.driversApi.setCardPaymentMode(card, mode));
      this.tell(`Card ${card.id_tag}: ${PaymentModeLabels.card(mode).toLowerCase()}.`);
    });
  }

  protected cardPaymentLabel(mode: string): string {
    return PaymentModeLabels.card(mode);
  }

  protected lastUsedOf(card: RfidCard): string {
    return DurationLabel.ago(card.last_used_at);
  }

  protected countOf(cards: number): string {
    return cards === 1 ? '1 card' : `${cards} cards`;
  }

  private async attempt(work: () => Promise<void>): Promise<void> {
    try {
      await work();
      this.changed.emit();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  private tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }
}
