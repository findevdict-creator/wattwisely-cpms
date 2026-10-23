import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Refund, SessionPayment } from '../../core/api/models/payment';
import { PaymentsApiService } from '../../core/api/payments-api.service';
import { Money } from '../../shared/money';

/** Gives part or all of a captured payment back. Above 100.00 a second person must approve. */
@Component({
  selector: 'ww-refund-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Refund the driver</h2>
    <mat-dialog-content [formGroup]="form">
      <p>
        Up to {{ available }} can still be refunded. Refunds above {{ limit }} wait for a second
        person's approval.
      </p>
      <mat-form-field appearance="outline">
        <mat-label>Amount in {{ payment.currency }}</mat-label>
        <input matInput formControlName="amount" inputmode="decimal" data-testid="refund-amount" />
      </mat-form-field>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Reason (the driver sees it)</mat-label>
        <input matInput formControlName="reason" maxlength="200" data-testid="refund-reason" />
      </mat-form-field>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Keep</button>
      <button mat-flat-button (click)="save()" [disabled]="isSaving()" data-testid="confirm">
        Refund
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .wide {
      width: 100%;
    }
  `,
})
export class RefundDialogComponent {
  static readonly APPROVAL_LIMIT = 10_000;

  protected readonly payment = inject<SessionPayment>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<RefundDialogComponent, Refund | null>>(MatDialogRef);
  private readonly paymentsApi = inject(PaymentsApiService);

  protected readonly form = new FormGroup({
    amount: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    reason: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3)],
    }),
  });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);
  protected readonly available = Money.format(
    (this.payment.captured_amount ?? 0) - this.payment.refunded_amount,
    this.payment.currency,
  );
  protected readonly limit = Money.format(
    RefundDialogComponent.APPROVAL_LIMIT,
    this.payment.currency,
  );

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    const amount = Money.fromText(this.form.controls.amount.value, this.payment.currency);
    if (this.form.invalid || amount === null || amount <= 0) {
      this.error.set('Enter an amount and a reason.');
      return;
    }
    this.isSaving.set(true);
    try {
      const reason = this.form.controls.reason.value.trim();
      const refund = this.paymentsApi.requestRefund(this.payment.id, { amount, reason });
      this.dialogRef.close(await firstValueFrom(refund));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
