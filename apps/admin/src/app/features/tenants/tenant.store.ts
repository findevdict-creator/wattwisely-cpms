import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { SetModuleRequest, SetSubscriptionRequest, Tenant } from '../../core/api/models/tenant';
import { TenantsApiService } from '../../core/api/tenants-api.service';

/**
 * One tenant's page: the tenant and every change staff make to it. Each change reloads
 * the tenant, and every outcome, good or bad, is told in a short message.
 */
@Injectable()
export class TenantStore {
  private readonly tenantsApi = inject(TenantsApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly tenant = signal<Tenant | null>(null);
  readonly error = signal('');
  private id = '';

  async load(id = this.id): Promise<void> {
    this.id = id;
    try {
      this.tenant.set(await firstValueFrom(this.tenantsApi.get(id)));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** The tenant, which every change needs for its version. */
  current(): Tenant {
    const tenant = this.tenant();
    if (!tenant) {
      throw new Error('The tenant is not loaded yet');
    }
    return tenant;
  }

  suspend(reason: string): Promise<void> {
    return this.change(this.tenantsApi.suspend(this.current(), reason), 'Tenant suspended.');
  }

  reactivate(reason: string): Promise<void> {
    return this.change(this.tenantsApi.reactivate(this.current(), reason), 'Tenant reactivated.');
  }

  delete(confirmSlug: string, reason: string): Promise<void> {
    const request = this.tenantsApi.delete(this.current(), confirmSlug, reason);
    return this.change(request, 'Tenant deleted. Its data is kept for the retention period.');
  }

  setSubscription(body: SetSubscriptionRequest): Promise<void> {
    return this.change(this.tenantsApi.setSubscription(this.id, body), 'Plan and billing saved.');
  }

  setModule(key: string, body: SetModuleRequest): Promise<void> {
    return this.change(this.tenantsApi.setModule(this.id, key, body), 'Module changed.');
  }

  resetModule(key: string): Promise<void> {
    const request = this.tenantsApi.resetModule(this.id, key);
    return this.change(request, 'Module follows the plan again.');
  }

  inviteOwner(email: string): Promise<void> {
    return this.change(this.tenantsApi.inviteOwner(this.id, email), `Invitation sent to ${email}.`);
  }

  tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }

  private async change(request: Observable<unknown>, success: string): Promise<void> {
    try {
      await firstValueFrom(request, { defaultValue: undefined });
      this.tell(success);
      await this.load();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }
}
