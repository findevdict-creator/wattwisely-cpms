import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Permission, Role } from '../../core/api/models/role';
import { TeamApiService } from '../../core/api/team-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { PermissionGroup, PermissionMatrix } from './permission-matrix';
import { RoleDialogComponent, RoleDialogData } from './role-dialog.component';

/**
 * Team > Roles: the permission matrix, every role against every permission (module 14).
 * Built-in roles are read-only; custom roles are created, changed and deleted here on plans
 * with the custom_roles module.
 */
@Component({
  selector: 'ww-roles',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule, RouterLink],
  templateUrl: './roles.component.html',
  styleUrl: './roles.component.scss',
})
export class RolesComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly teamApi = inject(TeamApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly roles = signal<Role[]>([]);
  protected readonly catalogue = signal<Permission[]>([]);
  protected readonly groups = signal<PermissionGroup[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');
  protected readonly holds = PermissionMatrix.holds;

  ngOnInit(): void {
    void this.load();
  }

  /** True when this person may shape custom roles here and the plan includes them. */
  protected canManage(): boolean {
    return (
      this.permissions.canChange('custom_roles:manage') &&
      !this.permissions.isModuleLocked('custom_roles')
    );
  }

  protected isLocked(): boolean {
    return this.permissions.isModuleLocked('custom_roles');
  }

  protected members(role: Role): string {
    return role.member_count === 1 ? '1 member' : `${role.member_count} members`;
  }

  protected async edit(role: Role | null): Promise<void> {
    const data: RoleDialogData = { role, roles: this.roles(), permissions: this.catalogue() };
    const dialog = this.dialog.open(RoleDialogComponent, { data, width: '640px' });
    const saved: Role | undefined = await firstValueFrom(dialog.afterClosed());
    if (saved) {
      this.tell(role ? `${saved.name} saved.` : `${saved.name} created.`);
      await this.load();
    }
  }

  protected async remove(role: Role): Promise<void> {
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: `Delete ${role.name}?`,
        message: 'Nobody holds it. The audit log keeps what it allowed.',
        confirmLabel: 'Delete role',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) !== true) {
      return;
    }
    try {
      await firstValueFrom(this.teamApi.removeRole(role), { defaultValue: undefined });
      this.tell(`${role.name} deleted.`);
      await this.load();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  private async load(): Promise<void> {
    this.isLoading.set(true);
    try {
      const [roles, catalogue] = await Promise.all([
        firstValueFrom(this.teamApi.listRoles()),
        firstValueFrom(this.teamApi.listPermissions()),
      ]);
      this.roles.set(roles);
      this.catalogue.set(catalogue);
      this.groups.set(PermissionMatrix.group(catalogue));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoading.set(false);
    }
  }

  private tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }
}
