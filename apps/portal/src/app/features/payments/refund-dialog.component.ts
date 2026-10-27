import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Refund the driver</h2>
    <mat-dialog-content [formGroup]="form" class="content">
      <p class="lead">Up to {{ available }} can be refunded to {{ card }}.</p>
      <mat-form-field appearance="outline">
        <mat-label>Amount</mat-label>
        <span matTextPrefix>{{ symbol }}&nbsp;</span>
        <input matInput formControlName="amount" inputmode="decimal" data-testid="refund-amount" />
        <mat-hint>Use {{ available }} for a full refund.</mat-hint>
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Reason, the driver sees it</mat-label>
        <input matInput formControlName="reason" maxlength="200" data-testid="refund-reason" />
      </mat-form-field>
      <p class="notice info has-icon">
        <mat-icon svgIcon="info" />
        <span>Refunds over {{ limit }} wait for a second person's approval.</span>
      </p>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button (click)="save()" [disabled]="isSaving()" data-testid="confirm">
        {{ buttonLabel() }}
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .lead,
    .notice {
      margin: 0;
    }
    .lead {
      color: var(--mat-sys-on-surface-variant);
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
  protected readonly card = this.payment.card_last4
    ? `the card ending ${this.payment.card_last4}`
    : 'the card';
  protected readonly symbol = Money.symbol(this.payment.currency);
  protected readonly limit = Money.format(
    RefundDialogComponent.APPROVAL_LIMIT,
    this.payment.currency,
  );

  /** "Refund £4.40" once the amount reads as money. */
  protected buttonLabel(): string {
    const amount = Money.fromText(this.form.controls.amount.value, this.payment.currency);
    return amount ? `Refund ${Money.format(amount, this.payment.currency)}` : 'Refund';
  }

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
