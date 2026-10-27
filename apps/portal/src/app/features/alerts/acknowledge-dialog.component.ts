import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { AlertsApiService } from '../../core/api/alerts-api.service';
import { Alert } from '../../core/api/models/alert';

/** Marks an alert as seen to, with a note for the rest of the team (story NTF-04). */
@Component({
  selector: 'ww-acknowledge-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Acknowledge alert</h2>
    <mat-dialog-content>
      <p>{{ alert.title }}</p>
      <p class="hint">
        The alert stays until the problem clears. Everyone sees that you are on it.
      </p>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Note (optional)</mat-label>
        <textarea
          matInput
          [formControl]="note"
          maxlength="500"
          rows="3"
          data-testid="acknowledge-note"
        ></textarea>
      </mat-form-field>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button [mat-dialog-close]="null">Cancel</button>
      <button mat-flat-button (click)="save()" [disabled]="isSaving()" data-testid="confirm">
        Acknowledge
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
export class AcknowledgeDialogComponent {
  protected readonly alert = inject<Alert>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<AcknowledgeDialogComponent, Alert | null>>(MatDialogRef);
  private readonly alertsApi = inject(AlertsApiService);

  protected readonly note = new FormControl('', { nonNullable: true });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    this.isSaving.set(true);
    try {
      const saved = await firstValueFrom(
        this.alertsApi.acknowledge(this.alert, this.note.value.trim()),
      );
      this.dialogRef.close(saved);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
