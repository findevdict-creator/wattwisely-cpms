import { Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { firstValueFrom } from 'rxjs';
import { StaffMember } from '../../core/api/models/staff';
import { StaffApiService } from '../../core/api/staff-api.service';

/** Who already works in the tenant, so they are not offered twice. */
export interface AssignOperatorDialogData {
  tenantName: string;
  assignedStaffIds: string[];
}

/** Picks a staff member to work in the tenant as its Managed operator. Closes with the staff id. */
@Component({
  selector: 'ww-assign-operator-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  template: `
    <h2 mat-dialog-title>Assign an operator to {{ data.tenantName }}</h2>
    <mat-dialog-content>
      <p class="ww-lead">
        They join the tenant's team with the Managed operator role: sites, chargers, tariffs,
        sessions, drivers, payments and alerts, but not the team or the plan. The tenant sees them
        as "Wattwisely".
      </p>
      <div class="ww-form">
        <mat-form-field appearance="outline" subscriptSizing="dynamic">
          <mat-label>Staff member</mat-label>
          <mat-select [formControl]="staffId" data-testid="operator-staff">
            @for (member of staff(); track member.id) {
              <mat-option [value]="member.id">{{ member.name || member.email }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button
        mat-flat-button
        [disabled]="staffId.invalid"
        [mat-dialog-close]="staffId.value"
        data-testid="assign-operator"
      >
        Assign
      </button>
    </mat-dialog-actions>
  `,
})
export class AssignOperatorDialogComponent implements OnInit {
  protected readonly data = inject<AssignOperatorDialogData>(MAT_DIALOG_DATA);
  private readonly staffApi = inject(StaffApiService);

  protected readonly staff = signal<StaffMember[]>([]);
  protected readonly staffId = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required],
  });

  async ngOnInit(): Promise<void> {
    const members = await firstValueFrom(this.staffApi.list());
    this.staff.set(
      members.filter(
        (member) => !member.removed_at && !this.data.assignedStaffIds.includes(member.id),
      ),
    );
  }
}
