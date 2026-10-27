import { Clipboard } from '@angular/cdk/clipboard';
import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../../core/api/api-problem';
import { IntegrationsApiService } from '../../../core/api/integrations-api.service';
import { WebhookDelivery, WebhookEndpoint } from '../../../core/api/models/webhook';
import { PermissionsService } from '../../../core/permissions/permissions.service';
import { ConfirmDialogComponent } from '../../../shared/confirm-dialog.component';
import { StatusChipComponent } from '../../../shared/status-chip.component';
import { WebhookDialogComponent, WebhookDialogData } from './webhook-dialog.component';

/** One webhook endpoint (module 16): its secret, its switches and the deliveries it got. */
@Component({
  selector: 'ww-webhook',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatTooltipModule,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './webhook.component.html',
  styleUrl: './webhook.component.scss',
})
export class WebhookComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly integrationsApi = inject(IntegrationsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly clipboard = inject(Clipboard);

  protected readonly columns = ['event', 'status', 'attempts', 'last_attempt', 'result'];
  protected readonly endpoint = signal<WebhookEndpoint | null>(null);
  protected readonly deliveries = signal<WebhookDelivery[]>([]);
  protected readonly isSecretShown = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected canManage(): boolean {
    return (
      this.permissions.canChange('api_keys:manage') && !this.permissions.isModuleLocked('api_keys')
    );
  }

  protected copySecret(endpoint: WebhookEndpoint): void {
    this.clipboard.copy(endpoint.secret);
    this.snackBar.open('Secret copied.', 'OK', { duration: 3000 });
  }

  protected resultOf(delivery: WebhookDelivery): string {
    if (delivery.last_status_code !== null) {
      return `HTTP ${delivery.last_status_code}`;
    }
    return delivery.last_error ?? '';
  }

  protected async edit(endpoint: WebhookEndpoint): Promise<void> {
    const data: WebhookDialogData = {
      eventTypes: await firstValueFrom(this.integrationsApi.listEventTypes()),
      endpoint,
    };
    const dialog = this.dialog.open(WebhookDialogComponent, { data, width: '640px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      await this.load();
    }
  }

  protected async toggle(endpoint: WebhookEndpoint): Promise<void> {
    await this.apply(
      this.integrationsApi.updateWebhook(endpoint, { is_active: !endpoint.is_active }),
      endpoint.is_active ? 'Webhook paused.' : 'Webhook resumed.',
    );
  }

  protected async sendTest(endpoint: WebhookEndpoint): Promise<void> {
    await this.apply(
      this.integrationsApi.testWebhook(endpoint.id),
      'Test queued: a ping goes out within a few seconds.',
    );
  }

  protected async remove(endpoint: WebhookEndpoint): Promise<void> {
    const dialog = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Remove this webhook?',
        message: `${endpoint.url} stops getting events and its deliveries are forgotten.`,
        confirmLabel: 'Remove webhook',
      },
    });
    if ((await firstValueFrom(dialog.afterClosed())) !== true) {
      return;
    }
    try {
      await firstValueFrom(this.integrationsApi.removeWebhook(endpoint));
      await this.router.navigate(['/settings/webhooks']);
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    }
  }

  protected async refresh(): Promise<void> {
    await this.load();
  }

  private async apply(request: Observable<unknown>, done: string): Promise<void> {
    try {
      await firstValueFrom(request);
      this.snackBar.open(done, 'OK', { duration: 4000 });
      await this.load();
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    }
  }

  private async load(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id') ?? '';
    try {
      const [endpoint, deliveries] = await Promise.all([
        firstValueFrom(this.integrationsApi.getWebhook(id)),
        firstValueFrom(this.integrationsApi.listDeliveries(id)),
      ]);
      this.endpoint.set(endpoint);
      this.deliveries.set(deliveries);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
