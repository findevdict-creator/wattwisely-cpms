import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { SessionDetail, SessionFilter, SessionPage, SessionReading } from './models/session';

/** Calls /v1/sessions: lists, details, the energy chart, closing and the CSV export. */
@Injectable({ providedIn: 'root' })
export class SessionsApiService {
  static readonly PAGE_SIZE = 50;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(filter: SessionFilter, cursor: string | null = null): Observable<SessionPage> {
    let params = SessionsApiService.paramsOf(filter).set('limit', SessionsApiService.PAGE_SIZE);
    params = cursor ? params.set('cursor', cursor) : params;
    return this.http.get<SessionPage>(this.url('sessions'), { params });
  }

  get(id: string): Observable<SessionDetail> {
    return this.http.get<SessionDetail>(this.url(`sessions/${id}`));
  }

  readings(id: string): Observable<SessionReading[]> {
    return this.http.get<SessionReading[]>(this.url(`sessions/${id}/meter-values`));
  }

  close(id: string): Observable<SessionDetail> {
    return this.http.post<SessionDetail>(this.url(`sessions/${id}/close`), {});
  }

  /** The filtered sessions as a CSV file. */
  exportCsv(filter: SessionFilter): Observable<Blob> {
    return this.http.get(this.url('sessions/export'), {
      params: SessionsApiService.paramsOf(filter),
      responseType: 'blob',
    });
  }

  private static paramsOf(filter: SessionFilter): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filter)) {
      params = value ? params.set(key, value) : params;
    }
    return params;
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
