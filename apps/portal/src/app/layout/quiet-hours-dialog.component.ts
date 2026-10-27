import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../core/api/api-problem';
import { NotificationsApiService } from '../core/api/notifications-api.service';
import { QuietHours } from './quiet-hours';

/**
 * Quiet hours (story NTF-03): alert e-mails wait until they end, and are dropped when the
 * alert closed in the meantime. Faulted connectors still go out at once. Portal
 * notifications always arrive.
 */
@Component({
  selector: 'ww-quiet-hours-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Quiet hours</h2>
    <mat-dialog-content [formGroup]="form">
      <p class="hint">
        Alert e-mails wait until your quiet hours end. A faulted connector is still sent at once,
        and the bell always shows everything.
      </p>
      <div class="row">
        <mat-form-field appearance="outline">
          <mat-label>From</mat-label>
          <input matInput type="time" formControlName="start" data-testid="quiet-start" />
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Until</mat-label>
          <input matInput type="time" formControlName="end" data-testid="quiet-end" />
        </mat-form-field>
      </div>
      <mat-form-field appearance="outline" class="wide">
        <mat-label>Time zone</mat-label>
        <input matInput formControlName="timeZone" />
      </mat-form-field>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="clear()">No quiet hours</button>
      <button mat-button [mat-dialog-close]="false">Cancel</button>
      <button mat-flat-button (click)="save()" [disabled]="isSaving()" data-testid="save-quiet">
        Save
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .row {
      display: flex;
      gap: 12px;
    }
    .wide {
      width: 100%;
    }
    .hint {
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class QuietHoursDialogComponent implements OnInit {
  private readonly notificationsApi = inject(NotificationsApiService);
  private readonly dialogRef =
    inject<MatDialogRef<QuietHoursDialogComponent, boolean>>(MatDialogRef);

  protected readonly form = new FormGroup({
    start: new FormControl('', { nonNullable: true }),
    end: new FormControl('', { nonNullable: true }),
    timeZone: new FormControl(QuietHours.browserTimeZone(), { nonNullable: true }),
  });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  async ngOnInit(): Promise<void> {
    const settings = await firstValueFrom(this.notificationsApi.settings());
    const hasZone = settings.quiet_hours_start !== null;
    this.form.setValue({
      start: settings.quiet_hours_start ?? '',
      end: settings.quiet_hours_end ?? '',
      timeZone: hasZone ? settings.time_zone : QuietHours.browserTimeZone(),
    });
  }

  protected clear(): void {
    this.form.patchValue({ start: '', end: '' });
  }

  protected async save(): Promise<void> {
    const { start, end, timeZone } = this.form.getRawValue();
    const problem = QuietHours.problem(start, end);
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.notificationsApi.saveSettings(QuietHours.toSettings(start, end, timeZone.trim())),
      );
      this.dialogRef.close(true);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
