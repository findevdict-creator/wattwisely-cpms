import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  ManagedNoticeRequest,
  ManagedOperator,
  ManagedService,
  ManagedServiceTerms,
  ServiceReport,
} from './models/managed-service';

/** Calls /v1/admin/tenants/{id}/managed-service: the agreement, its operators and the report. */
@Injectable({ providedIn: 'root' })
export class ManagedServiceApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  /** 404 with code managed_service_not_found when the tenant never had an agreement. */
  get(tenantId: string): Observable<ManagedService> {
    return this.http.get<ManagedService>(this.url(tenantId));
  }

  offer(tenantId: string, terms: ManagedServiceTerms): Observable<ManagedService> {
    return this.http.post<ManagedService>(this.url(tenantId), terms);
  }

  update(service: ManagedService, terms: ManagedServiceTerms): Observable<ManagedService> {
    return this.http.patch<ManagedService>(
      this.url(service.tenant_id),
      terms,
      this.ifMatch(service),
    );
  }

  withdraw(service: ManagedService): Observable<ManagedService> {
    return this.http.post<ManagedService>(
      this.url(service.tenant_id, '/withdraw'),
      {},
      this.ifMatch(service),
    );
  }

  giveNotice(service: ManagedService, request: ManagedNoticeRequest): Observable<ManagedService> {
    return this.http.post<ManagedService>(
      this.url(service.tenant_id, '/notice'),
      request,
      this.ifMatch(service),
    );
  }

  assignOperator(tenantId: string, staffId: string): Observable<ManagedOperator> {
    return this.http.put<ManagedOperator>(this.url(tenantId, `/operators/${staffId}`), {});
  }

  removeOperator(tenantId: string, staffId: string): Observable<void> {
    return this.http.delete<void>(this.url(tenantId, `/operators/${staffId}`));
  }

  report(tenantId: string, month: string): Observable<ServiceReport> {
    const params = new HttpParams().set('month', month);
    return this.http.get<ServiceReport>(this.url(tenantId, '/report'), { params });
  }

  private url(tenantId: string, path = ''): string {
    return `${this.runtimeConfig.apiUrl}/v1/admin/tenants/${tenantId}/managed-service${path}`;
  }

  private ifMatch(service: ManagedService) {
    return { headers: { 'If-Match': String(service.version) } };
  }
}
