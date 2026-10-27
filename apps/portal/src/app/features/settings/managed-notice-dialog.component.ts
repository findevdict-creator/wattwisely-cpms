import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { ManagedNoticeRequest } from '../../core/api/models/managed-service';

/**
 * Asks the Owner when the managed service should end (30 days from today at the earliest)
 * and why. Closes with the notice to send, or undefined.
 */
@Component({
  selector: 'ww-managed-notice-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>End the managed service?</h2>
    <mat-dialog-content [formGroup]="form">
      <p>
        Wattwisely keeps running your charging until the day you choose, 30 days from today at the
        earliest. After that its staff lose access and you run everything yourself.
      </p>
      <mat-form-field appearance="outline" class="field">
        <mat-label>Last day of the service</mat-label>
        <input
          matInput
          type="date"
          formControlName="endsOn"
          [min]="earliest"
          data-testid="ends-on"
        />
      </mat-form-field>
      <mat-form-field appearance="outline" class="field">
        <mat-label>Reason (for the audit log)</mat-label>
        <input matInput formControlName="reason" maxlength="500" />
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Keep the service</button>
      <button mat-flat-button [disabled]="form.invalid" (click)="confirm()" data-testid="confirm">
        Give notice
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .field {
      display: block;
      width: 100%;
    }
  `,
})
export class ManagedNoticeDialogComponent {
  static readonly NOTICE_DAYS = 30;

  private readonly dialogRef = inject(MatDialogRef<ManagedNoticeDialogComponent>);
  protected readonly earliest = ManagedNoticeDialogComponent.dateIn(
    ManagedNoticeDialogComponent.NOTICE_DAYS,
  );
  protected readonly form = new FormGroup({
    endsOn: new FormControl(this.earliest, {
      nonNullable: true,
      validators: [Validators.required],
    }),
    reason: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(500)] }),
  });

  protected confirm(): void {
    const value = this.form.getRawValue();
    const request: ManagedNoticeRequest = {
      ends_at: new Date(`${value.endsOn}T23:59:59`).toISOString(),
      ...(value.reason.trim() ? { reason: value.reason.trim() } : {}),
    };
    this.dialogRef.close(request);
  }

  /** Today plus some days, as a date input wants it ("2026-06-22"), in local time. */
  static dateIn(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return [date.getFullYear(), date.getMonth() + 1, date.getDate()]
      .map((part) => String(part).padStart(2, '0'))
      .join('-');
  }
}
