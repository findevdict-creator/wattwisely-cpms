import { Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Member } from '../../core/api/models/member';
import { Role, RoleAssignment } from '../../core/api/models/role';
import { TeamApiService } from '../../core/api/team-api.service';
import { RolePickerComponent, SiteOption } from '../../shared/role-picker.component';
import { MemberRoles } from './member-roles';

/** What the edit-roles dialog works on. */
export interface EditRolesData {
  member: Member;
  roles: Role[];
  sites: SiteOption[];
}

/** Changes a member's roles. The change applies on their next request (story ACC-03). */
@Component({
  selector: 'ww-edit-roles-dialog',
  imports: [MatButtonModule, MatDialogModule, RolePickerComponent],
  templateUrl: './edit-roles-dialog.component.html',
})
export class EditRolesDialogComponent {
  protected readonly data = inject<EditRolesData>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<EditRolesDialogComponent, Member>>(MatDialogRef);
  private readonly teamApi = inject(TeamApiService);

  protected readonly assignments = signal<RoleAssignment[]>(
    MemberRoles.assignmentsOf(this.data.member),
  );
  protected readonly error = signal('');
  protected readonly isSaving = signal(false);

  protected async save(): Promise<void> {
    if (!MemberRoles.isComplete(this.assignments())) {
      this.error.set('Choose at least one role, with its sites, or remove the person instead.');
      return;
    }
    this.isSaving.set(true);
    try {
      const request = this.teamApi.replaceRoles(this.data.member.id, this.assignments());
      this.dialogRef.close(await firstValueFrom(request));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isSaving.set(false);
    }
  }
}
