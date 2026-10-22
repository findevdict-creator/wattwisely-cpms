import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { InviteResult } from '../../core/api/models/member';
import { Role, RoleAssignment } from '../../core/api/models/role';
import { TeamApiService } from '../../core/api/team-api.service';
import { RolePickerComponent, SiteOption } from '../../shared/role-picker.component';
import { MemberRoles } from './member-roles';

/** What the invite dialog offers to choose from. */
export interface InviteDialogData {
  roles: Role[];
  sites: SiteOption[];
}

/** Invite someone by e-mail with one or more roles (story ACC-02). Closes with the InviteResult. */
@Component({
  selector: 'ww-invite-dialog',
  imports: [
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    ReactiveFormsModule,
    RolePickerComponent,
  ],
  templateUrl: './invite-dialog.component.html',
})
export class InviteDialogComponent {
  protected readonly data = inject<InviteDialogData>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<InviteDialogComponent, InviteResult>>(MatDialogRef);
  private readonly teamApi = inject(TeamApiService);

  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email],
  });
  protected readonly assignments = signal<RoleAssignment[]>([]);
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async send(): Promise<void> {
    if (this.email.invalid || !MemberRoles.isComplete(this.assignments())) {
      this.error.set('Enter an e-mail address and choose at least one role, with its sites.');
      return;
    }
    this.isSaving.set(true);
    try {
      const request = this.teamApi.invite(this.email.value.trim(), this.assignments());
      this.dialogRef.close(await firstValueFrom(request));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
