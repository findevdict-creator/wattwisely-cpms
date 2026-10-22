import { Injectable, computed, signal } from '@angular/core';
import { Me } from '../api/models/me';
import { TenantMembership } from '../api/models/tenant-membership';
import { LastTenantStore } from './last-tenant.store';

/**
 * Remembers who the user is and which tenant they are working in.
 * It holds state only and makes no HTTP calls, so the HTTP interceptor can read it safely.
 */
@Injectable({ providedIn: 'root' })
export class TenantContextService {
  private readonly lastTenantStore = new LastTenantStore();
  private readonly meState = signal<Me | null>(null);
  private readonly tenantIdState = signal<string | null>(null);

  readonly me = this.meState.asReadonly();
  readonly currentTenantId = this.tenantIdState.asReadonly();
  readonly tenants = computed(() => this.meState()?.tenants ?? []);
  readonly currentTenant = computed(
    () => this.tenants().find((tenant) => tenant.id === this.tenantIdState()) ?? null,
  );

  isLoaded(): boolean {
    return this.meState() !== null;
  }

  /** Stores the user and picks their tenant: the one used last time, or the only one they have (story ACC-01). */
  setMe(me: Me): void {
    this.meState.set(me);
    const lastTenantId = this.lastTenantStore.read();
    const lastTenant = me.tenants.find((tenant) => tenant.id === lastTenantId);
    const onlyTenant = me.tenants.length === 1 ? me.tenants[0] : undefined;
    this.tenantIdState.set((lastTenant ?? onlyTenant)?.id ?? null);
  }

  selectTenant(tenant: TenantMembership): void {
    this.lastTenantStore.write(tenant.id);
    this.tenantIdState.set(tenant.id);
  }
}
