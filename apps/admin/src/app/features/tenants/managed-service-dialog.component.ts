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
import { Money } from '../../shared/money';

/** The agreement to edit, or null to offer a new one. */
export interface ManagedServiceDialogData {
  tenantName: string;
  service: ManagedService | null;
  /** The plan's currency, which the fee is in. */
  currency: string;
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
    <mat-dialog-content>
      @if (!data.service) {
        <p class="ww-lead">
          The tenant's Owners get an e-mail. Nothing changes until one of them accepts in the
          portal; then staff you assign work in the tenant as Managed operators.
        </p>
      }
      <form
        class="ww-form two"
        [formGroup]="form"
        (ngSubmit)="form.valid && fee() !== null && save()"
      >
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="wide">
          <mat-label>Account manager</mat-label>
          <mat-select formControlName="account_manager_id" data-testid="account-manager">
            @for (member of staff(); track member.id) {
              <mat-option [value]="member.id">{{ member.name || member.email }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Monthly fee</mat-label>
          <input matInput formControlName="monthly_fee" data-testid="monthly-fee" />
          <span matTextSuffix>{{ currency }}</span>
          <mat-hint>Invoiced with the plan each month; 0 for none</mat-hint>
          @if (form.controls.monthly_fee.dirty && fee() === null) {
            <mat-error>An amount such as 250.00</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Agreement reference</mat-label>
          <input matInput formControlName="agreement_reference" data-testid="agreement-reference" />
        </mat-form-field>
        <mat-checkbox
          class="wide"
          formControlName="is_tariff_approval_required"
          data-testid="approval-required"
        >
          Tariff changes by Managed operators need the Owner's approval
        </mat-checkbox>
        <mat-form-field appearance="outline" subscriptSizing="dynamic" class="wide">
          <mat-label>Notes, staff only</mat-label>
          <textarea matInput formControlName="notes" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        [disabled]="form.invalid || fee() === null"
        (click)="save()"
        data-testid="save-managed-service"
      >
        {{ data.service ? 'Save' : 'Send the offer' }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ManagedServiceDialogComponent implements OnInit {
  private static readonly BLANK: ManagedServiceDefaults = {
    account_manager: null,
    is_tariff_approval_required: true,
    monthly_fee: 0,
    agreement_reference: '',
    notes: '',
  };

  protected readonly data = inject<ManagedServiceDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ManagedServiceDialogComponent, ManagedServiceTerms>>(MatDialogRef);
  private readonly staffApi = inject(StaffApiService);

  protected readonly currency = this.data.currency;
  protected readonly staff = signal<StaffMember[]>([]);
  /** The agreement to edit, or what a new offer starts from. */
  private readonly initial: ManagedServiceDefaults =
    this.data.service ?? ManagedServiceDialogComponent.BLANK;
  protected readonly form = inject(FormBuilder).nonNullable.group({
    account_manager_id: [this.initial.account_manager?.staff_id ?? '', Validators.required],
    is_tariff_approval_required: [this.initial.is_tariff_approval_required],
    monthly_fee: [Money.toText(this.initial.monthly_fee, this.currency)],
    agreement_reference: [this.initial.agreement_reference, Validators.maxLength(100)],
    notes: [this.initial.notes ?? '', Validators.maxLength(2000)],
  });

  async ngOnInit(): Promise<void> {
    const members = await firstValueFrom(this.staffApi.list());
    this.staff.set(members.filter((member) => !member.removed_at));
  }

  /** The fee in minor units; null while the text is not an amount. */
  protected fee(): number | null {
    return Money.fromText(this.form.controls.monthly_fee.value, this.currency);
  }

  protected save(): void {
    const value = this.form.getRawValue();
    this.dialogRef.close({
      ...value,
      monthly_fee: this.fee() ?? 0,
      agreement_reference: value.agreement_reference.trim(),
      notes: value.notes.trim(),
    });
  }
}

/** The terms the dialog starts from. */
type ManagedServiceDefaults = Pick<
  ManagedService,
  | 'account_manager'
  | 'is_tariff_approval_required'
  | 'monthly_fee'
  | 'agreement_reference'
  | 'notes'
>;
