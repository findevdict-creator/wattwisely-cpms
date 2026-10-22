import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { TenantMembership } from './models/tenant-membership';

/** Calls GET /v1/tenant: the tenant the API sees for this request (from X-Tenant-Id). */
@Injectable({ providedIn: 'root' })
export class TenantApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  getCurrent(): Observable<TenantMembership> {
    return this.http.get<TenantMembership>(`${this.runtimeConfig.apiUrl}/v1/tenant`);
  }
}
