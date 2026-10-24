import { Routes } from '@angular/router';
import { PermissionGuard } from '../../core/permissions/permission.guard';
import { RolesComponent } from './roles.component';
import { TeamComponent } from './team.component';

/** The Team pages, inside the shell: the members, and the roles with their permission matrix (module 14). */
export const TEAM_ROUTES: Routes = [
  {
    path: 'team',
    component: TeamComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'team:read' },
  },
  {
    path: 'team/roles',
    component: RolesComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'team:read' },
  },
];
