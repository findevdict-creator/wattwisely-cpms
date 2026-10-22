import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { UserLoadedGuard } from './core/tenant/user-loaded.guard';
import { WorkspaceGuard } from './core/tenant/workspace.guard';
import { HomeComponent } from './features/home/home.component';
import { NoWorkspaceComponent } from './features/no-workspace/no-workspace.component';
import { TenantPickerComponent } from './features/tenant-picker/tenant-picker.component';
import { ShellComponent } from './layout/shell.component';

/**
 * Every page needs a login (AuthGuard on the top route, checked first).
 * Workspace pages also need a chosen tenant (WorkspaceGuard).
 */
export const APP_ROUTES: Routes = [
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
        children: [{ path: '', component: HomeComponent }],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
