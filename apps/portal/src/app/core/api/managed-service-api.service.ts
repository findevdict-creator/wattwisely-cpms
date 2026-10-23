import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { ManagedNoticeRequest, ManagedService } from './models/managed-service';
import { ServiceReport } from './models/service-report';

/** Calls /v1/managed-service: the agreement, the Owner's acceptance and notice, the monthly report. */
@Injectable({ providedIn: 'root' })
export class ManagedServiceApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  get(): Observable<ManagedService> {
    return this.http.get<ManagedService>(this.url(''));
  }

  /** The Owner accepts the terms; the service starts now. */
  accept(): Observable<ManagedService> {
    return this.http.post<ManagedService>(this.url('/accept'), { accept_terms: true });
  }

  /** The Owner ends the service, 30 days from now at the earliest. */
  giveNotice(request: ManagedNoticeRequest): Observable<ManagedService> {
    return this.http.post<ManagedService>(this.url('/notice'), request);
  }

  /** The service report of one month ('2026-05'); the previous month when omitted. */
  report(month?: string): Observable<ServiceReport> {
    const params = month ? new HttpParams().set('month', month) : new HttpParams();
    return this.http.get<ServiceReport>(this.url('/report'), { params });
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/managed-service${path}`;
  }
}
