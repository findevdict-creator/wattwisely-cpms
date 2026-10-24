import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { AdjustmentRequest } from '../../core/api/models/invoice';
import { Money } from '../../shared/money';

/** The currency the amount is in. */
export interface AdjustmentDialogData {
  currency: string;
}

/** An adjustment line for a draft: a description and an amount, negative for a credit. */
@Component({
  selector: 'ww-adjustment-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Add a line</h2>
    <mat-dialog-content class="content" [formGroup]="form">
      <p>A credit, a discount or a one-off charge. Put a minus in front of a credit.</p>
      <mat-form-field appearance="outline">
        <mat-label>Description</mat-label>
        <input matInput formControlName="description" data-testid="adjustment-description" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Amount ({{ data.currency }})</mat-label>
        <input
          matInput
          formControlName="amount"
          placeholder="-50.00"
          data-testid="adjustment-amount"
        />
        @if (form.controls.amount.dirty && amount() === null) {
          <mat-error>An amount such as 12.50 or -50.00</mat-error>
        }
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        [disabled]="form.invalid || amount() === null"
        (click)="save()"
        data-testid="save-adjustment"
      >
        Add line
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
export class AdjustmentDialogComponent {
  protected readonly data = inject<AdjustmentDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<AdjustmentDialogComponent, AdjustmentRequest>>(MatDialogRef);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    description: ['', [Validators.required, Validators.maxLength(200)]],
    amount: ['', Validators.required],
  });

  /** The amount in minor units, negative for a credit; null while the text is not an amount. */
  protected amount(): number | null {
    const text = this.form.controls.amount.value.trim();
    const isCredit = text.startsWith('-');
    const value = Money.fromText(isCredit ? text.slice(1) : text, this.data.currency);
    if (value === null || value === 0) {
      return null;
    }
    return isCredit ? -value : value;
  }

  protected save(): void {
    const amount = this.amount();
    if (amount !== null) {
      this.dialogRef.close({ description: this.form.controls.description.value.trim(), amount });
    }
  }
}
