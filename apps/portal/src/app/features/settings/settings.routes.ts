import { Routes } from '@angular/router';
import { PermissionGuard } from '../../core/permissions/permission.guard';
import { AlertRoutingComponent } from './alert-routing/alert-routing.component';
import { ApiKeysComponent } from './api-keys/api-keys.component';
import { BrandingComponent } from './branding.component';
import { InvoiceComponent } from './invoice.component';
import { InvoicesComponent } from './invoices.component';
import { ManagedServiceComponent } from './managed-service.component';
import { MessagingComponent } from './messaging/messaging.component';
import { PlanComponent } from './plan.component';
import { SettingsLayoutComponent } from './settings-layout.component';
import { WebhookComponent } from './webhooks/webhook.component';
import { WebhooksComponent } from './webhooks/webhooks.component';

/**
 * The Settings pages: branding, alert routing, WhatsApp charging, the plan, the managed
 * service, API keys and webhooks, inside the settings menu. The invoices keep their address
 * under /settings but sit in the side menu under Business, so they come first, outside it.
 */
export const SETTINGS_ROUTES: Routes = [
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
    path: 'settings',
    component: SettingsLayoutComponent,
    children: [
      {
        path: 'branding',
        component: BrandingComponent,
        canActivate: [PermissionGuard],
        data: {
          permission: 'settings:read',
          subtitle: 'How your company looks to drivers: the connector page, receipts and e-mails',
        },
      },
      {
        path: 'alert-routing',
        component: AlertRoutingComponent,
        canActivate: [PermissionGuard],
        data: {
          permission: 'settings:read',
          subtitle: 'Who hears about a problem, how, and when to stay quiet',
        },
      },
      {
        path: 'plan',
        component: PlanComponent,
        canActivate: [PermissionGuard],
        data: {
          permission: 'settings:read',
          subtitle: 'What your plan includes, what it costs and how much of it you use',
        },
      },
      {
        path: 'managed-service',
        component: ManagedServiceComponent,
        canActivate: [PermissionGuard],
        data: {
          permission: 'settings:read',
          subtitle: 'What Wattwisely runs for you, and how each month went',
        },
      },
      {
        path: 'api-keys',
        component: ApiKeysComponent,
        canActivate: [PermissionGuard],
        data: {
          permission: 'api_keys:manage',
          subtitle: 'Keys for your own systems to call the Wattwisely API',
        },
      },
      {
        path: 'webhooks',
        component: WebhooksComponent,
        canActivate: [PermissionGuard],
        data: {
          permission: 'api_keys:manage',
          subtitle: 'Events sent to your own systems the moment they happen',
        },
      },
      {
        path: 'webhooks/:id',
        component: WebhookComponent,
        canActivate: [PermissionGuard],
        data: {
          permission: 'api_keys:manage',
          subtitle: 'Events sent to your own systems the moment they happen',
        },
      },
      {
        path: 'messaging',
        component: MessagingComponent,
        canActivate: [PermissionGuard],
        data: {
          permission: 'messaging:manage',
          subtitle: 'Drivers find a charger, start and pay from WhatsApp',
        },
      },
    ],
  },
];
