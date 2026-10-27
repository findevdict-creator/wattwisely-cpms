import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { IntegrationsApiService } from '../../../core/api/integrations-api.service';
import { CreatedApiKey } from '../../../core/api/models/api-key';
import { Permission } from '../../../core/api/models/role';
import { PermissionGroup, PermissionMatrix } from '../../team/permission-matrix';
import { ApiKeyForm } from './api-key-form';

/** What the dialog works on: the permission catalogue. */
export interface ApiKeyDialogData {
  permissions: Permission[];
}

/** Make an API key (module 16): a name, an expiry and the permissions it holds. Closes with the key and its token. */
@Component({
  selector: 'ww-api-key-dialog',
  imports: [
    MatButtonModule,
    MatCheckboxModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatTooltipModule,
    ReactiveFormsModule,
  ],
  templateUrl: './api-key-dialog.component.html',
  styleUrl: './api-key-dialog.component.scss',
})
export class ApiKeyDialogComponent {
  private readonly data = inject<ApiKeyDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<ApiKeyDialogComponent, CreatedApiKey>>(MatDialogRef);
  private readonly integrationsApi = inject(IntegrationsApiService);

  protected readonly form = new ApiKeyForm();
  protected readonly groups: PermissionGroup[] = PermissionMatrix.group(
    ApiKeyForm.selectable(this.data.permissions),
  );
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected keysOf(group: PermissionGroup): string[] {
    return group.permissions.map((permission) => permission.key);
  }

  protected async save(): Promise<void> {
    this.form.fields.markAllAsTouched();
    if (!this.form.isValid()) {
      this.error.set(this.problem());
      return;
    }
    this.isSaving.set(true);
    try {
      const created = await firstValueFrom(this.integrationsApi.createKey(this.form.toInput()));
      this.dialogRef.close(created);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }

  private problem(): string {
    if (this.form.permissions().length === 0) {
      return 'Tick at least one permission.';
    }
    return this.form.isExpiryPast()
      ? 'The expiry must be in the future.'
      : 'Check the fields marked in red.';
  }
}
