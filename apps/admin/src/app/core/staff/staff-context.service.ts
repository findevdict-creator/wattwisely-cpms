import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MeApiService } from '../api/me-api.service';
import { Me } from '../api/models/me';

/**
 * Who is using the console and what their staff role allows, from GET /v1/me.
 * The console only hides what someone cannot do; the API enforces every rule itself.
 */
@Injectable({ providedIn: 'root' })
export class StaffContextService {
  private readonly meApi = inject(MeApiService);
  private readonly meState = signal<Me | null>(null);

  readonly me = this.meState.asReadonly();
  readonly isStaff = computed(() => this.meState()?.platform !== null);
  readonly roleName = computed(() => this.meState()?.platform?.role ?? '');

  async ensureLoaded(): Promise<void> {
    if (!this.meState()) {
      this.meState.set(await firstValueFrom(this.meApi.getMe()));
    }
  }

  /** True when my staff role holds the platform permission, e.g. 'tenants:write'. */
  can(permission: string): boolean {
    return this.meState()?.platform?.permissions.includes(permission) ?? false;
  }
}
