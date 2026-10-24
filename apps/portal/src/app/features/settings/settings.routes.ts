import { Routes } from '@angular/router';
import { PermissionGuard } from '../../core/permissions/permission.guard';
import { AlertRoutingComponent } from './alert-routing/alert-routing.component';
import { BrandingComponent } from './branding.component';
import { InvoiceComponent } from './invoice.component';
import { InvoicesComponent } from './invoices.component';
import { ManagedServiceComponent } from './managed-service.component';
import { PlanComponent } from './plan.component';

/** The Settings pages: branding, alert routing, the plan, the managed service and the invoices. */
export const SETTINGS_ROUTES: Routes = [
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
    path: 'settings/invoices',
    component: InvoicesComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'invoices:read' },
  },
  {
    path: 'settings/invoices/:id',
    component: InvoiceComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'invoices:read' },
  },
];
