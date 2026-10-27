import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Permission, Role } from '../../core/api/models/role';
import { TeamApiService } from '../../core/api/team-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog.component';
import { RoleAreas } from './role-areas';
import { RoleDialogComponent, RoleDialogData } from './role-dialog.component';
import { TeamTabsComponent } from './team-tabs.component';

/**
 * Team > Roles: the permission matrix, every role against every permission (module 14).
 * Built-in roles are read-only; custom roles are created, changed and deleted here on plans
 * with the custom_roles module.
 */
@Component({
  selector: 'ww-roles',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    PageHeaderComponent,
    TeamTabsComponent,
  ],
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
  protected readonly isLoading = signal(true);
  protected readonly error = signal('');
  protected readonly selectedId = signal<string | null>(null);
  protected readonly selected = computed<Role | null>(
    () => this.roles().find((role) => role.id === this.selectedId()) ?? this.roles()[0] ?? null,
  );
  protected readonly areas = computed(() => {
    const role = this.selected();
    return role ? RoleAreas.of(role, this.catalogue()) : [];
  });
  protected readonly countOf = (role: Role) => RoleAreas.countOf(role, this.catalogue());

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
      this.selectedId.set(saved.id);
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
