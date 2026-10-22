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

/** Changes how much is held on a driver's card at the start. Closes with the saved account. */
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
        Held on the driver's card when a session starts and released down to the final price. The
        charger is stopped once the cost reaches 90% of it.
      </p>
      <mat-form-field appearance="outline">
        <mat-label>Amount in {{ currency }}</mat-label>
        <input matInput [formControl]="amount" inputmode="decimal" data-testid="hold-amount" />
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
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    const minor = Money.fromText(this.amount.value, this.currency);
    if (minor === null || minor < 100) {
      this.error.set('Enter an amount of at least 1.00.');
      return;
    }
    this.isSaving.set(true);
    try {
      this.dialogRef.close(await firstValueFrom(this.paymentsApi.updateHold(this.account, minor)));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
