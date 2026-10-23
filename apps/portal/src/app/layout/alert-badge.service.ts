import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AlertsApiService } from '../core/api/alerts-api.service';
import { PermissionsService } from '../core/permissions/permissions.service';

/** The count of open alerts on the Alerts link, refreshed by the shell and after an acknowledgement. */
@Injectable({ providedIn: 'root' })
export class AlertBadgeService {
  private readonly alertsApi = inject(AlertsApiService);
  private readonly permissions = inject(PermissionsService);
  private readonly openCount = signal(0);

  readonly open = this.openCount.asReadonly();

  async refresh(): Promise<void> {
    if (!this.permissions.can('alerts:read')) {
      this.openCount.set(0);
      return;
    }
    try {
      this.openCount.set((await firstValueFrom(this.alertsApi.summary())).open);
    } catch {
      // A missed refresh keeps the last count; the next one tries again.
    }
  }
}
