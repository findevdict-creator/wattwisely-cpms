import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { StaffGuard } from './core/staff/staff.guard';
import { AuditLogComponent } from './features/audit-log/audit-log.component';
import { NotStaffComponent } from './features/not-staff/not-staff.component';
import { OverviewComponent } from './features/overview/overview.component';
import { PlansComponent } from './features/plans/plans.component';
import { StaffComponent } from './features/staff/staff.component';
import { ServiceReportComponent } from './features/tenants/service-report.component';
import { TenantComponent } from './features/tenants/tenant.component';
import { TenantsComponent } from './features/tenants/tenants.component';
import { ShellComponent } from './layout/shell.component';

/**
 * Every page needs a login (AuthGuard) and a Wattwisely staff role (StaffGuard); a page
 * can also name the platform permission it needs. Anyone else lands on the "not staff" page.
 */
export const APP_ROUTES: Routes = [
  {
    path: '',
    canActivate: [AuthGuard],
    children: [
      { path: 'not-staff', component: NotStaffComponent },
      {
        path: '',
        canActivate: [StaffGuard],
        component: ShellComponent,
        children: [
          { path: '', component: OverviewComponent },
          { path: 'tenants', component: TenantsComponent },
          { path: 'tenants/:id', component: TenantComponent },
          { path: 'tenants/:id/service-report', component: ServiceReportComponent },
          {
            path: 'plans',
            component: PlansComponent,
            canActivate: [StaffGuard],
            data: { permission: 'plans:read' },
          },
          {
            path: 'staff',
            component: StaffComponent,
            canActivate: [StaffGuard],
            data: { permission: 'staff:read' },
          },
          {
            path: 'audit-log',
            component: AuditLogComponent,
            canActivate: [StaffGuard],
            data: { permission: 'platform_audit:read' },
          },
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
