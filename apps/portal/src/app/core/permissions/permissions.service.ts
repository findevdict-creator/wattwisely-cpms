import { Injectable, computed, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { MeApiService } from '../api/me-api.service';
import { MyPermissions } from '../api/models/my-permissions';

/**
 * What the user may do in the current tenant, from GET /v1/me/permissions.
 * The portal only hides what someone cannot do; the API enforces every rule itself.
 */
@Injectable({ providedIn: 'root' })
export class PermissionsService {
  private readonly meApi = inject(MeApiService);
  private readonly state = signal<MyPermissions | null>(null);

  /** A suspended tenant can look at everything it could before, but change nothing. */
  readonly isReadOnly = computed(() => this.state()?.is_read_only ?? true);
  readonly roleNames = computed(() => [...new Set(this.state()?.roles.map((role) => role.name))]);
  readonly plan = computed(() => this.state()?.plan ?? null);
  readonly lockedModules = computed(() => this.state()?.locked_modules ?? []);

  async ensureLoaded(): Promise<void> {
    if (!this.state()) {
      this.state.set(await firstValueFrom(this.meApi.getPermissions()));
    }
  }

  /** True when the user holds the permission anywhere (for some sites or the whole tenant). */
  can(key: string): boolean {
    return this.state()?.permissions.some((permission) => permission.key === key) ?? false;
  }

  /** True when the tenant's plan leaves the module out, e.g. 'advanced_reports'. Ask Wattwisely to add it. */
  isModuleLocked(moduleKey: string): boolean {
    return this.lockedModules().includes(moduleKey);
  }

  /** True when the user holds a permission that changes things, and the tenant is not suspended. */
  canChange(key: string): boolean {
    return this.can(key) && !this.isReadOnly();
  }
}
