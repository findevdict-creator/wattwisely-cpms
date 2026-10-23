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
  /** The managed service agreement, offered or in force; null for a self-serve tenant. */
  readonly managedService = computed(() => this.state()?.managed_service ?? null);
  /** True once the Owner accepted: Wattwisely staff work in the tenant as Managed operators. */
  readonly isManaged = computed(() => {
    const status = this.managedService()?.status;
    return status === 'active' || status === 'ending';
  });
  /** True for Wattwisely staff working in this tenant as its Managed operator. */
  readonly isManagedOperator = computed(() => this.managedService()?.is_operator ?? false);
  /** True when this user's tariff changes become proposals for the Owner to approve. */
  readonly mustProposeTariffs = computed(
    () => this.isManagedOperator() && (this.managedService()?.is_tariff_approval_required ?? false),
  );

  async ensureLoaded(): Promise<void> {
    if (!this.state()) {
      await this.reload();
    }
  }

  /** After a change that alters what the user may do, such as accepting the managed service. */
  async reload(): Promise<void> {
    this.state.set(await firstValueFrom(this.meApi.getPermissions()));
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
