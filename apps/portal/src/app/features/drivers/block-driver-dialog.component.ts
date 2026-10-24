import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriversApiService } from '../../core/api/drivers-api.service';
import { Driver, DriverDetail } from '../../core/api/models/driver';

/** Blocks a driver with a reason (story DRV-02): every card of theirs is refused from now on. */
@Component({
  selector: 'ww-block-driver-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Block {{ driver.name }}?</h2>
    <mat-dialog-content>
      <p class="hint">
        Chargers answer Blocked to every card of this driver until you unblock them. A charge that
        is running is not stopped.
      </p>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Reason (optional)</mat-label>
        <textarea
          matInput
          [formControl]="reason"
          maxlength="500"
          rows="3"
          data-testid="block-reason"
        ></textarea>
      </mat-form-field>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Keep</button>
      <button mat-flat-button (click)="save()" [disabled]="isSaving()" data-testid="confirm">
        Block driver
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .wide {
      width: 100%;
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class BlockDriverDialogComponent {
  protected readonly driver = inject<Driver>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<BlockDriverDialogComponent, DriverDetail | null>>(MatDialogRef);
  private readonly driversApi = inject(DriversApiService);

  protected readonly reason = new FormControl('', { nonNullable: true });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    this.isSaving.set(true);
    try {
      const saved = await firstValueFrom(
        this.driversApi.block(this.driver, this.reason.value.trim()),
      );
      this.dialogRef.close(saved);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
