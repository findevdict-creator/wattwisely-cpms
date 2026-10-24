import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriversApiService } from '../../core/api/drivers-api.service';
import { RfidCard } from '../../core/api/models/driver';

/** Registers an RFID card for a driver (story DRV-03). Closes with the new card. */
@Component({
  selector: 'ww-card-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Register card</h2>
    <mat-dialog-content>
      <form [formGroup]="form" (ngSubmit)="save()">
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Tag</mat-label>
          <input matInput formControlName="idTag" maxlength="20" data-testid="card-tag" />
          <mat-hint>What the charger reads from the card, up to 20 characters</mat-hint>
          <mat-error>Letters, digits and *_=:+|@.- only, up to 20</mat-error>
        </mat-form-field>
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Label (optional)</mat-label>
          <input matInput formControlName="label" maxlength="100" />
        </mat-form-field>
        <mat-form-field appearance="outline" class="wide">
          <mat-label>Valid until (optional)</mat-label>
          <input matInput formControlName="expiresOn" type="date" />
        </mat-form-field>
      </form>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button (click)="save()" [disabled]="isSaving()" data-testid="save-card">
        Register
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .wide {
      width: 100%;
      margin-top: 8px;
    }
  `,
})
export class CardDialogComponent {
  static readonly TAG = /^[A-Za-z0-9*_=:+|@.-]{1,20}$/;

  private readonly driverId = inject<string>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<CardDialogComponent, RfidCard>>(MatDialogRef);
  private readonly driversApi = inject(DriversApiService);

  protected readonly form = new FormGroup({
    idTag: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(CardDialogComponent.TAG)],
    }),
    label: new FormControl('', { nonNullable: true }),
    expiresOn: new FormControl('', { nonNullable: true }),
  });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    this.form.markAllAsTouched();
    if (!this.form.valid) {
      return;
    }
    this.isSaving.set(true);
    const value = this.form.getRawValue();
    try {
      const card = await firstValueFrom(
        this.driversApi.addCard(this.driverId, {
          id_tag: value.idTag.trim(),
          label: value.label.trim(),
          expires_at: value.expiresOn
            ? new Date(`${value.expiresOn}T23:59:59`).toISOString()
            : null,
        }),
      );
      this.dialogRef.close(card);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
