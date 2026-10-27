import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PaymentAccount } from '../../core/api/models/payment';
import { PaymentsApiService } from '../../core/api/payments-api.service';
import { Money } from '../../shared/money';

/**
 * Changes how much is held on a card at the start: the guest hold for a driver paying at the QR
 * page, and the member hold for the company's own drivers paying with a saved card (module 19).
 * Closes with the saved account.
 */
@Component({
  selector: 'ww-hold-amount-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Card hold</h2>
    <mat-dialog-content>
      <p>
        Held on the card when a session starts and released down to the final price. The charger is
        stopped once the cost reaches 90% of it.
      </p>
      <mat-form-field appearance="outline">
        <mat-label>Guests, in {{ currency }}</mat-label>
        <input matInput [formControl]="amount" inputmode="decimal" data-testid="hold-amount" />
        <mat-hint>Drivers paying at the QR page without an account</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Your drivers, in {{ currency }}</mat-label>
        <input
          matInput
          [formControl]="memberAmount"
          inputmode="decimal"
          data-testid="member-hold-amount"
        />
        <mat-hint>Your drivers' saved cards, unless one of their groups sets its own</mat-hint>
      </mat-form-field>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Keep</button>
      <button mat-flat-button (click)="save()" [disabled]="isSaving()" data-testid="confirm">
        Save
      </button>
    </mat-dialog-actions>
  `,
})
export class HoldAmountDialogComponent {
  protected readonly account = inject<PaymentAccount>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<HoldAmountDialogComponent, PaymentAccount | null>>(MatDialogRef);
  private readonly paymentsApi = inject(PaymentsApiService);

  protected readonly currency = this.account.default_currency ?? 'GBP';
  protected readonly amount = new FormControl(
    Money.toText(this.account.hold_amount, this.currency),
    {
      nonNullable: true,
      validators: [Validators.required],
    },
  );
  protected readonly memberAmount = new FormControl(
    Money.toText(this.account.member_hold_amount, this.currency),
    { nonNullable: true, validators: [Validators.required] },
  );
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    const guest = Money.fromText(this.amount.value, this.currency);
    const member = Money.fromText(this.memberAmount.value, this.currency);
    if (guest === null || guest < 100 || member === null || member < 100) {
      this.error.set('Enter amounts of at least 1.00.');
      return;
    }
    const holds = { hold_amount: guest, member_hold_amount: member };
    this.isSaving.set(true);
    try {
      this.dialogRef.close(await firstValueFrom(this.paymentsApi.updateHold(this.account, holds)));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
