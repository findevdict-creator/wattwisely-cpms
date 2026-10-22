import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { AuditLogPage } from './models/audit-log';

/** Calls GET /v1/audit-log, one page at a time (story SEC-01). */
@Injectable({ providedIn: 'root' })
export class AuditLogApiService {
  static readonly PAGE_SIZE = 50;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(cursor: string | null): Observable<AuditLogPage> {
    let params = new HttpParams().set('limit', AuditLogApiService.PAGE_SIZE);
    if (cursor) {
      params = params.set('cursor', cursor);
    }
    return this.http.get<AuditLogPage>(`${this.runtimeConfig.apiUrl}/v1/audit-log`, { params });
  }
}
