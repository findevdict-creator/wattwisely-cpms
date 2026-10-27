import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Router, RouterLink } from '@angular/router';
import { EmptyStateComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { IntegrationsApiService } from '../../../core/api/integrations-api.service';
import { WebhookEndpoint } from '../../../core/api/models/webhook';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { DurationLabel } from '../../../shared/duration-label';
import { StatusChipComponent } from '../../../shared/status-chip.component';
import { WebhookDialogComponent, WebhookDialogData } from './webhook-dialog.component';

/** Settings > Webhooks (module 16): the endpoints that hear about sessions and alerts. */
@Component({
  selector: 'ww-webhooks',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    RouterLink,
    EmptyStateComponent,
    StatusChipComponent,
  ],
  templateUrl: './webhooks.component.html',
  styleUrl: './webhooks.component.scss',
})
export class WebhooksComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly integrationsApi = inject(IntegrationsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);

  protected readonly columns = ['url', 'events', 'status', 'last_delivery', 'open'];
  protected readonly endpoints = signal<WebhookEndpoint[]>([]);
  protected readonly isLoaded = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected isLocked(): boolean {
    return this.permissions.isModuleLocked('api_keys');
  }

  protected canManage(): boolean {
    return this.permissions.canChange('api_keys:manage') && !this.isLocked();
  }

  protected statusOf(endpoint: WebhookEndpoint): string {
    return endpoint.is_active ? 'active' : 'paused';
  }

  /** The first two event types, then how many more. */
  protected eventsOf(endpoint: WebhookEndpoint): string {
    const shown = endpoint.event_types.slice(0, 2).join(' · ');
    const more = endpoint.event_types.length - 2;
    return more > 0 ? `${shown} +${more}` : shown;
  }

  protected lastDeliveryOf(endpoint: WebhookEndpoint): string {
    return endpoint.last_delivery_at ? DurationLabel.ago(endpoint.last_delivery_at) : 'None yet';
  }

  protected async add(): Promise<void> {
    const data: WebhookDialogData = {
      eventTypes: await firstValueFrom(this.integrationsApi.listEventTypes()),
      endpoint: null,
    };
    const dialog = this.dialog.open(WebhookDialogComponent, { data, width: '640px' });
    const created: WebhookEndpoint | undefined = await firstValueFrom(dialog.afterClosed());
    if (created) {
      await this.router.navigate(['/settings/webhooks', created.id]);
    }
  }

  private async load(): Promise<void> {
    try {
      this.endpoints.set(await firstValueFrom(this.integrationsApi.listWebhooks()));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoaded.set(true);
    }
  }
}
