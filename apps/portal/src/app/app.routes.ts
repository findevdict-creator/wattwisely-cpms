import { Routes } from '@angular/router';
import { AuthGuard } from './core/auth/auth.guard';
import { UserLoadedGuard } from './core/tenant/user-loaded.guard';
import { WorkspaceGuard } from './core/tenant/workspace.guard';
import { PermissionGuard } from './core/permissions/permission.guard';
import { AlertsComponent } from './features/alerts/alerts.component';
import { AuditLogComponent } from './features/audit-log/audit-log.component';
import { ChargerComponent } from './features/chargers/charger.component';
import { ChargersComponent } from './features/chargers/chargers.component';
import { HomeComponent } from './features/home/home.component';
import { InvitationComponent } from './features/invitation/invitation.component';
import { NoWorkspaceComponent } from './features/no-workspace/no-workspace.component';
import { PaymentsComponent } from './features/payments/payments.component';
import { ReportsComponent } from './features/reports/reports.component';
import { AlertRoutingComponent } from './features/settings/alert-routing/alert-routing.component';
import { BrandingComponent } from './features/settings/branding.component';
import { ManagedServiceComponent } from './features/settings/managed-service.component';
import { PlanComponent } from './features/settings/plan.component';
import { SessionComponent } from './features/sessions/session.component';
import { SessionsComponent } from './features/sessions/sessions.component';
import { SiteComponent } from './features/sites/site.component';
import { SitesComponent } from './features/sites/sites.component';
import { TariffProposalComponent } from './features/tariffs/proposals/tariff-proposal.component';
import { TariffProposalsComponent } from './features/tariffs/proposals/tariff-proposals.component';
import { TariffComponent } from './features/tariffs/tariff.component';
import { TariffsComponent } from './features/tariffs/tariffs.component';
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
            path: 'alerts',
            component: AlertsComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'alerts:read' },
          },
          {
            path: 'alerts/:id',
            component: AlertsComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'alerts:read' },
          },
          {
            path: 'reports',
            component: ReportsComponent,
            canActivate: [PermissionGuard],
            data: { permission: ['reports:read', 'sessions:export', 'audit:read'] },
          },
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
            path: 'sessions',
            component: SessionsComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'sessions:read' },
          },
          {
            path: 'sessions/:id',
            component: SessionComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'sessions:read' },
          },
          {
            path: 'tariffs',
            component: TariffsComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'tariffs:read' },
          },
          {
            path: 'tariffs/new',
            component: TariffComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'tariffs:write' },
          },
          {
            path: 'tariffs/proposals',
            component: TariffProposalsComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'tariffs:read' },
          },
          {
            path: 'tariffs/proposals/:id',
            component: TariffProposalComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'tariffs:read' },
          },
          {
            path: 'tariffs/:id',
            component: TariffComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'tariffs:read' },
          },
          {
            path: 'payments',
            component: PaymentsComponent,
            canActivate: [PermissionGuard],
            data: { permission: ['payments:read', 'settings:payments'] },
          },
          {
            path: 'settings/branding',
            component: BrandingComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'settings:read' },
          },
          {
            path: 'settings/alert-routing',
            component: AlertRoutingComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'settings:read' },
          },
          {
            path: 'settings/plan',
            component: PlanComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'settings:read' },
          },
          {
            path: 'settings/managed-service',
            component: ManagedServiceComponent,
            canActivate: [PermissionGuard],
            data: { permission: 'settings:read' },
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
