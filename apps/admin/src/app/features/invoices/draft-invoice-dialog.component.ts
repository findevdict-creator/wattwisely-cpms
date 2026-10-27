import { Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { InvoiceMonths } from './invoice-months';

/** Whose invoice. */
export interface DraftInvoiceDialogData {
  tenantName: string;
}

/** Picks the past month to draft an invoice for by hand. Closes with "2026-09". */
@Component({
  selector: 'ww-draft-invoice-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Draft an invoice for {{ data.tenantName }}</h2>
    <mat-dialog-content class="content">
      <p>
        For a month the worker skipped (nothing to bill then, or the tenant had no plan) or whose
        invoice was voided. The lines come from today's plan, size, prices and tax rate.
      </p>
      <mat-form-field appearance="outline">
        <mat-label>Month</mat-label>
        <mat-select [formControl]="month" data-testid="draft-month">
          @for (option of months; track option.key) {
            <mat-option [value]="option.key">{{ option.label }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        [disabled]="month.invalid"
        [mat-dialog-close]="month.value"
        data-testid="confirm-draft"
      >
        Draft
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
      max-width: 420px;
    }
  `,
})
export class DraftInvoiceDialogComponent {
  protected readonly data = inject<DraftInvoiceDialogData>(MAT_DIALOG_DATA);
  protected readonly months = InvoiceMonths.past();
  protected readonly month = new FormControl(this.months[0].key, {
    nonNullable: true,
    validators: Validators.required,
  });
}
