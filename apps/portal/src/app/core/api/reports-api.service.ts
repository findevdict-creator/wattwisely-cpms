import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  ExportRequest,
  Overview,
  ReportExport,
  ReportSchedule,
  ReportScheduleRequest,
  UsageQuery,
  UsageReport,
} from './models/report';

/** Calls /v1/reports: the usage report, the home page numbers, exports and schedules. */
@Injectable({ providedIn: 'root' })
export class ReportsApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  usage(query: UsageQuery): Observable<UsageReport> {
    return this.http.get<UsageReport>(this.url('reports/usage'), { params: this.params(query) });
  }

  usageCsv(query: UsageQuery): Observable<Blob> {
    return this.http.get(this.url('reports/usage/export'), {
      params: this.params(query),
      responseType: 'blob',
    });
  }

  overview(): Observable<Overview> {
    return this.http.get<Overview>(this.url('reports/overview'));
  }

  createExport(request: ExportRequest): Observable<ReportExport> {
    return this.http.post<ReportExport>(this.url('reports/exports'), request);
  }

  exports(): Observable<{ items: ReportExport[] }> {
    return this.http.get<{ items: ReportExport[] }>(this.url('reports/exports'));
  }

  download(id: string): Observable<Blob> {
    return this.http.get(this.url(`reports/exports/${id}/download`), { responseType: 'blob' });
  }

  schedules(): Observable<{ items: ReportSchedule[] }> {
    return this.http.get<{ items: ReportSchedule[] }>(this.url('reports/schedules'));
  }

  createSchedule(request: ReportScheduleRequest): Observable<ReportSchedule> {
    return this.http.post<ReportSchedule>(this.url('reports/schedules'), request);
  }

  updateSchedule(
    schedule: ReportSchedule,
    request: ReportScheduleRequest,
  ): Observable<ReportSchedule> {
    return this.http.put<ReportSchedule>(this.url(`reports/schedules/${schedule.id}`), request, {
      headers: { 'If-Match': String(schedule.version) },
    });
  }

  deleteSchedule(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`reports/schedules/${id}`));
  }

  private params(query: object): HttpParams {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      params = value ? params.set(key, String(value)) : params;
    }
    return params;
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
