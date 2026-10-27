import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { SetModuleRequest, TenantModule } from '../../core/api/models/tenant';

/** Which module is switched, and which way. */
export interface ModuleDialogData {
  module: TenantModule;
  isEnabled: boolean;
}

/** Switch one module on (as an add-on, a trial or an override) or off (override). Closes with the body. */
@Component({
  selector: 'ww-module-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.isEnabled ? 'Switch on' : 'Switch off' }} {{ data.module.name }}
    </h2>
    <mat-dialog-content>
      @if (data.isEnabled) {
        <p class="ww-lead">
          The tenant's team can use it within a minute. Say why, so the invoice and the audit log
          tell the same story.
        </p>
      } @else {
        <div class="notice warn">
          The tenant's team loses access to this module within a minute, even if their plan includes
          it. "Follow the plan again" undoes this.
        </div>
      }
      <form class="ww-form" [formGroup]="form" (ngSubmit)="save()">
        @if (data.isEnabled) {
          <mat-form-field appearance="outline" subscriptSizing="dynamic">
            <mat-label>Why</mat-label>
            <mat-select formControlName="source" data-testid="module-source">
              @if (data.module.kind === 'addon') {
                <mat-option value="addon">Bought as an add-on</mat-option>
              }
              <mat-option value="trial">Trial until a date</mat-option>
              <mat-option value="override">Included by Wattwisely</mat-option>
            </mat-select>
          </mat-form-field>
          @if (form.controls.source.value === 'trial') {
            <mat-form-field appearance="outline" subscriptSizing="dynamic">
              <mat-label>Trial ends</mat-label>
              <input matInput type="date" formControlName="ends_at" data-testid="module-ends" />
            </mat-form-field>
          }
        }
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Note for the audit log</mat-label>
          <input matInput formControlName="note" data-testid="module-note" />
        </mat-form-field>
        @if (error()) {
          <div class="notice danger" role="alert">{{ error() }}</div>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button (click)="save()" data-testid="save-module">
        {{ data.isEnabled ? 'Switch on' : 'Switch off' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ModuleDialogComponent {
  protected readonly data = inject<ModuleDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ModuleDialogComponent, SetModuleRequest>>(MatDialogRef);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    source: [this.defaultSource()],
    ends_at: [''],
    note: ['', Validators.maxLength(500)],
  });
  protected readonly error = signal('');

  protected save(): void {
    const value = this.form.getRawValue();
    const source = this.data.isEnabled ? value.source : 'override';
    if (source === 'trial' && !value.ends_at) {
      this.error.set('Choose the day the trial ends.');
      return;
    }
    this.dialogRef.close({
      source,
      is_enabled: this.data.isEnabled,
      ends_at: source === 'trial' ? value.ends_at : null,
      note: value.note.trim() || undefined,
    });
  }

  private defaultSource(): SetModuleRequest['source'] {
    return this.data.module.kind === 'addon' ? 'addon' : 'override';
  }
}
