import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  CreateTenantRequest,
  SetModuleRequest,
  SetSubscriptionRequest,
  Subscription,
  Tenant,
  TenantOwner,
  TenantPage,
} from './models/tenant';

/** The tenants a filter asks for. */
export interface TenantFilter {
  q?: string;
  status?: string;
  plan?: string;
  cursor?: string | null;
}

/** Calls /v1/admin/tenants and everything under it. */
@Injectable({ providedIn: 'root' })
export class TenantsApiService {
  static readonly PAGE_SIZE = 50;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(filter: TenantFilter): Observable<TenantPage> {
    let params = new HttpParams().set('limit', TenantsApiService.PAGE_SIZE);
    for (const [key, value] of Object.entries(filter)) {
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<TenantPage>(this.url(''), { params });
  }

  get(id: string): Observable<Tenant> {
    return this.http.get<Tenant>(this.url(`/${id}`));
  }

  create(
    body: CreateTenantRequest,
  ): Observable<{ tenant: Tenant; is_owner_email_sent: boolean | null }> {
    return this.http.post<{ tenant: Tenant; is_owner_email_sent: boolean | null }>(
      this.url(''),
      body,
    );
  }

  update(tenant: Tenant, body: { name?: string; region?: string | null; payment_mode?: string }) {
    return this.http.patch<Tenant>(this.url(`/${tenant.id}`), body, this.ifMatch(tenant.version));
  }

  suspend(tenant: Tenant, reason: string): Observable<Tenant> {
    return this.http.post<Tenant>(
      this.url(`/${tenant.id}/suspend`),
      { reason },
      this.ifMatch(tenant.version),
    );
  }

  reactivate(tenant: Tenant, reason: string): Observable<Tenant> {
    return this.http.post<Tenant>(
      this.url(`/${tenant.id}/reactivate`),
      { reason },
      this.ifMatch(tenant.version),
    );
  }

  delete(tenant: Tenant, confirmSlug: string, reason: string): Observable<Tenant> {
    const body = { confirm_slug: confirmSlug, reason };
    return this.http.post<Tenant>(
      this.url(`/${tenant.id}/delete`),
      body,
      this.ifMatch(tenant.version),
    );
  }

  setSubscription(tenantId: string, body: SetSubscriptionRequest): Observable<Subscription> {
    return this.http.put<Subscription>(this.url(`/${tenantId}/subscription`), body);
  }

  setModule(tenantId: string, key: string, body: SetModuleRequest): Observable<Subscription> {
    return this.http.put<Subscription>(this.url(`/${tenantId}/modules/${key}`), body);
  }

  resetModule(tenantId: string, key: string): Observable<Subscription> {
    return this.http.delete<Subscription>(this.url(`/${tenantId}/modules/${key}`));
  }

  inviteOwner(tenantId: string, email: string) {
    return this.http.post<{ owner: TenantOwner; is_email_sent: boolean }>(
      this.url(`/${tenantId}/owners/invites`),
      { email },
    );
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/admin/tenants${path}`;
  }

  private ifMatch(version: number) {
    return { headers: { 'If-Match': String(version) } };
  }
}
