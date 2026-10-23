import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { Alert, AlertPage, AlertRule, AlertRules, AlertStatus, AlertSummary } from './models/alert';

/** Calls /v1/alerts and /v1/alert-rules (stories NTF-03 and NTF-04). */
@Injectable({ providedIn: 'root' })
export class AlertsApiService {
  static readonly PAGE_SIZE = 50;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(status: AlertStatus, cursor: string | null = null): Observable<AlertPage> {
    let params = new HttpParams().set('status', status).set('limit', AlertsApiService.PAGE_SIZE);
    params = cursor ? params.set('cursor', cursor) : params;
    return this.http.get<AlertPage>(this.url('alerts'), { params });
  }

  get(id: string): Observable<Alert> {
    return this.http.get<Alert>(this.url(`alerts/${id}`));
  }

  summary(): Observable<AlertSummary> {
    return this.http.get<AlertSummary>(this.url('alerts/summary'));
  }

  acknowledge(alert: Alert, note: string): Observable<Alert> {
    return this.http.post<Alert>(
      this.url(`alerts/${alert.id}/acknowledge`),
      { note },
      { headers: { 'If-Match': String(alert.version) } },
    );
  }

  rules(): Observable<AlertRules> {
    return this.http.get<AlertRules>(this.url('alert-rules'));
  }

  saveRules(rules: AlertRule[]): Observable<AlertRules> {
    const body = rules.map((rule) => ({
      alert_type: rule.alert_type,
      site_id: rule.site_id,
      role_id: rule.role_id,
      membership_id: rule.membership_id,
      is_email: rule.is_email,
      is_in_portal: rule.is_in_portal,
    }));
    return this.http.put<AlertRules>(this.url('alert-rules'), { rules: body });
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
