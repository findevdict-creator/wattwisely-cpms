import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { PlatformAuditPage } from './models/audit-log';
import { Overview } from './models/overview';

/** Calls GET /v1/admin/overview and GET /v1/admin/audit-log. */
@Injectable({ providedIn: 'root' })
export class OverviewApiService {
  static readonly PAGE_SIZE = 50;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  getOverview(): Observable<Overview> {
    return this.http.get<Overview>(`${this.runtimeConfig.apiUrl}/v1/admin/overview`);
  }

  listAuditLog(cursor: string | null, tenantId: string | null = null) {
    let params = new HttpParams().set('limit', OverviewApiService.PAGE_SIZE);
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    if (tenantId) {
      params = params.set('tenant_id', tenantId);
    }
    return this.http.get<PlatformAuditPage>(`${this.runtimeConfig.apiUrl}/v1/admin/audit-log`, {
      params,
    });
  }
}
