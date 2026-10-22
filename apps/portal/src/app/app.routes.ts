import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { UserLoadedGuard } from './core/tenant/user-loaded.guard';
import { WorkspaceGuard } from './core/tenant/workspace.guard';
import { PermissionGuard } from './core/permissions/permission.guard';
import { AuditLogComponent } from './features/audit-log/audit-log.component';
import { ChargerComponent } from './features/chargers/charger.component';
import { ChargersComponent } from './features/chargers/chargers.component';
import { HomeComponent } from './features/home/home.component';
import { InvitationComponent } from './features/invitation/invitation.component';
import { NoWorkspaceComponent } from './features/no-workspace/no-workspace.component';
import { SiteComponent } from './features/sites/site.component';
import { SitesComponent } from './features/sites/sites.component';
import { TeamComponent } from './features/team/team.component';
import { TenantPickerComponent } from './features/tenant-picker/tenant-picker.component';
import { ShellComponent } from './layout/shell.component';

/**
 * Every page needs a login (AuthGuard on the top route, checked first), except the
 * invitation page, which people open from an e-mail before they have an account.
 * Workspace pages also need a chosen tenant (WorkspaceGuard), and some a permission.
 */
export const APP_ROUTES: Routes = [
  { path: 'invitations/:token', component: InvitationComponent },
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: 'no-workspace', component: NoWorkspaceComponent },
      { path: 'select-tenant', canActivate: [UserLoadedGuard], component: TenantPickerComponent },
      {
        path: '',
        canActivate: [WorkspaceGuard],
        component: ShellComponent,
        children: [
          { path: '', component: HomeComponent },
          {
            path: 'sites',
            component: SitesComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'sites:read' },
          },
          {
            path: 'sites/:id',
            component: SiteComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'sites:read' },
          },
          {
            path: 'chargers',
            component: ChargersComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'chargers:read' },
          },
          {
            path: 'chargers/:id',
            component: ChargerComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'chargers:read' },
          },
          {
            path: 'team',
            component: TeamComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'team:read' },
          },
          {
            path: 'audit-log',
            component: AuditLogComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'audit:read' },
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
