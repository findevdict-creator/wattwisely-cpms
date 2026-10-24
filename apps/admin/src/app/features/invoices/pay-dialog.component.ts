import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PayInvoiceRequest } from '../../core/api/models/invoice';

/** The invoice to mark paid. */
export interface PayDialogData {
  number: string;
  total: string;
}

/** Marks an invoice paid: when the money arrived and under what reference. */
@Component({
  selector: 'ww-pay-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Mark {{ data.number }} as paid</h2>
    <mat-dialog-content class="content" [formGroup]="form">
      <p>{{ data.total }} received. A paid invoice cannot be changed or voided afterwards.</p>
      <mat-form-field appearance="outline">
        <mat-label>Paid on</mat-label>
        <input matInput type="date" formControlName="paid_at" data-testid="paid-on" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Payment reference (optional)</mat-label>
        <input matInput formControlName="payment_reference" data-testid="payment-reference" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button [disabled]="form.invalid" (click)="save()" data-testid="confirm-paid">
        Mark paid
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
      min-width: 360px;
    }
  `,
})
export class PayDialogComponent {
  protected readonly data = inject<PayDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<PayDialogComponent, PayInvoiceRequest>>(MatDialogRef);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    paid_at: [new Date().toISOString().slice(0, 10), Validators.required],
    payment_reference: ['', Validators.maxLength(120)],
  });

  protected save(): void {
    const value = this.form.getRawValue();
    this.dialogRef.close({
      paid_at: `${value.paid_at}T12:00:00Z`,
      payment_reference: value.payment_reference.trim() || undefined,
    });
  }
}
