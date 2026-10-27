import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PlatformRoleDefinition, StaffMember } from '../../core/api/models/staff';
import { StaffApiService } from '../../core/api/staff-api.service';

/** Give a colleague a console role by e-mail. Closes with the new staff member. */
@Component({
  selector: 'ww-add-staff-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Add a staff member</h2>
    <mat-dialog-content class="content" [formGroup]="form">
      <mat-form-field appearance="outline">
        <mat-label>E-mail address</mat-label>
        <input matInput type="email" formControlName="email" data-testid="staff-email" />
        <mat-hint
          >They log in with Wattwisely single sign-on; no invitation e-mail is sent</mat-hint
        >
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Role</mat-label>
        <mat-select formControlName="role" data-testid="staff-role">
          @for (role of roles; track role.key) {
            <mat-option [value]="role.key">{{ role.name }} — {{ role.description }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-flat-button (click)="save()" [disabled]="isSaving()" data-testid="save-staff">
        Add
      </button>
    </mat-dialog-actions>
  `,
  styles: `
    .content {
      display: flex;
      flex-direction: column;
      gap: 8px;
      padding-top: 8px;
    }
  `,
})
export class AddStaffDialogComponent {
  protected readonly roles = inject<PlatformRoleDefinition[]>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<AddStaffDialogComponent, StaffMember>>(MatDialogRef);
  private readonly staffApi = inject(StaffApiService);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    role: ['support', Validators.required],
  });
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    if (this.form.invalid) {
      this.error.set('Enter an e-mail address and choose a role.');
      return;
    }
    const value = this.form.getRawValue();
    this.isSaving.set(true);
    try {
      this.dialogRef.close(await firstValueFrom(this.staffApi.add(value.email.trim(), value.role)));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
