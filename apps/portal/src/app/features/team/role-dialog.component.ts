import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Permission, Role } from '../../core/api/models/role';
import { TeamApiService } from '../../core/api/team-api.service';
import { PermissionGroup, PermissionMatrix } from './permission-matrix';
import { RoleForm } from './role-form';

/** What the role dialog works on: the role to edit (null for a new one), and the catalogue. */
export interface RoleDialogData {
  role: Role | null;
  roles: Role[];
  permissions: Permission[];
}

/** Create a custom role, or change one (module 14). Closes with the saved role. */
@Component({
  selector: 'ww-role-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './role-dialog.component.html',
  styleUrl: './role-dialog.component.scss',
})
export class RoleDialogComponent {
  protected readonly data = inject<RoleDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<RoleDialogComponent, Role>>(MatDialogRef);
  private readonly teamApi = inject(TeamApiService);

  protected readonly form = this.data.role ? RoleForm.from(this.data.role) : new RoleForm();
  protected readonly groups: PermissionGroup[] = PermissionMatrix.group(this.data.permissions);
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected keysOf(group: PermissionGroup): string[] {
    return group.permissions.map((permission) => permission.key);
  }

  protected copyFrom(roleId: string): void {
    const role = this.data.roles.find((candidate) => candidate.id === roleId);
    if (role) {
      this.form.copyFrom(role);
    }
  }

  protected async save(): Promise<void> {
    this.form.fields.markAllAsTouched();
    if (!this.form.isValid()) {
      this.error.set(
        this.form.permissions().length === 0
          ? 'Tick at least one permission.'
          : 'Check the fields marked in red.',
      );
      return;
    }
    this.isSaving.set(true);
    try {
      const input = this.form.toInput();
      const request = this.data.role
        ? this.teamApi.updateRole(this.data.role, input)
        : this.teamApi.createRole(input);
      this.dialogRef.close(await firstValueFrom(request));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
