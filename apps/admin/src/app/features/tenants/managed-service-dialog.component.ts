import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { ManagedService, ManagedServiceTerms } from '../../core/api/models/managed-service';
import { StaffMember } from '../../core/api/models/staff';
import { StaffApiService } from '../../core/api/staff-api.service';

/** The agreement to edit, or null to offer a new one. */
export interface ManagedServiceDialogData {
  tenantName: string;
  service: ManagedService | null;
}

/** The terms of a managed service agreement: account manager, approval rule, reference, notes. */
@Component({
  selector: 'ww-managed-service-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>
      {{ data.service ? 'Change the terms' : 'Offer the managed service to ' + data.tenantName }}
    </h2>
    <mat-dialog-content class="content" [formGroup]="form">
      @if (!data.service) {
        <p>
          The tenant's Owners get an e-mail. Nothing changes until one of them accepts in the
          portal; then staff you assign work in the tenant as Managed operators.
        </p>
      }
      <mat-form-field appearance="outline">
        <mat-label>Account manager</mat-label>
        <mat-select formControlName="account_manager_id" data-testid="account-manager">
          @for (member of staff(); track member.id) {
            <mat-option [value]="member.id">{{ member.name || member.email }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      <mat-checkbox formControlName="is_tariff_approval_required" data-testid="approval-required">
        Tariff changes by Managed operators need the Owner's approval
      </mat-checkbox>
      <mat-form-field appearance="outline">
        <mat-label>Agreement reference</mat-label>
        <input matInput formControlName="agreement_reference" data-testid="agreement-reference" />
      </mat-form-field>
      <mat-form-field appearance="outline">
        <mat-label>Notes (staff only)</mat-label>
        <textarea matInput formControlName="notes" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        [disabled]="form.invalid"
        (click)="save()"
        data-testid="save-managed-service"
      >
        {{ data.service ? 'Save' : 'Send the offer' }}
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
export class ManagedServiceDialogComponent implements OnInit {
  protected readonly data = inject<ManagedServiceDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ManagedServiceDialogComponent, ManagedServiceTerms>>(MatDialogRef);
  private readonly staffApi = inject(StaffApiService);

  protected readonly staff = signal<StaffMember[]>([]);
  protected readonly form = inject(FormBuilder).nonNullable.group({
    account_manager_id: [this.data.service?.account_manager?.staff_id ?? '', Validators.required],
    is_tariff_approval_required: [this.data.service?.is_tariff_approval_required ?? true],
    agreement_reference: [this.data.service?.agreement_reference ?? '', Validators.maxLength(100)],
    notes: [this.data.service?.notes ?? '', Validators.maxLength(2000)],
  });

  async ngOnInit(): Promise<void> {
    const members = await firstValueFrom(this.staffApi.list());
    this.staff.set(members.filter((member) => !member.removed_at));
  }

  protected save(): void {
    const value = this.form.getRawValue();
    this.dialogRef.close({
      ...value,
      agreement_reference: value.agreement_reference.trim(),
      notes: value.notes.trim(),
    });
  }
}
