import { Routes } from '@angular/router';
import { PermissionGuard } from '../../core/permissions/permission.guard';
import { AlertRoutingComponent } from './alert-routing/alert-routing.component';
import { ApiKeysComponent } from './api-keys/api-keys.component';
import { BrandingComponent } from './branding.component';
import { InvoiceComponent } from './invoice.component';
import { InvoicesComponent } from './invoices.component';
import { ManagedServiceComponent } from './managed-service.component';
import { PlanComponent } from './plan.component';
import { WebhookComponent } from './webhooks/webhook.component';
import { WebhooksComponent } from './webhooks/webhooks.component';

/** The Settings pages: branding, alert routing, the plan, the managed service, the invoices, API keys and webhooks. */
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
  {
    path: 'settings/api-keys',
    component: ApiKeysComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'api_keys:manage' },
  },
  {
    path: 'settings/webhooks',
    component: WebhooksComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'api_keys:manage' },
  },
  {
    path: 'settings/webhooks/:id',
    component: WebhookComponent,
    canActivate: [PermissionGuard],
    data: { permission: 'api_keys:manage' },
  },
];
