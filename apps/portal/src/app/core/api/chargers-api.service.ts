import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  Charger,
  ChargerChanges,
  ChargerFilter,
  ChargerPage,
  Connector,
  ConnectorInput,
  RegisterChargerInput,
  RegisteredCharger,
} from './models/charger';

/** Calls /v1/chargers and /v1/connectors (stories AST-02 and AST-03). */
@Injectable({ providedIn: 'root' })
export class ChargersApiService {
  static readonly PAGE_SIZE = 50;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(filter: ChargerFilter, cursor: string | null = null): Observable<ChargerPage> {
    let params = new HttpParams().set('limit', ChargersApiService.PAGE_SIZE);
    params = filter.site_id ? params.set('site_id', filter.site_id) : params;
    params = filter.status?.length ? params.set('status', filter.status.join(',')) : params;
    params = filter.q ? params.set('q', filter.q) : params;
    params = cursor ? params.set('cursor', cursor) : params;
    return this.http.get<ChargerPage>(this.url('chargers'), { params });
  }

  get(id: string): Observable<Charger> {
    return this.http.get<Charger>(this.url(`chargers/${id}`));
  }

  register(input: RegisterChargerInput): Observable<RegisteredCharger> {
    return this.http.post<RegisteredCharger>(this.url('chargers'), input);
  }

  update(charger: Charger, changes: ChargerChanges): Observable<Charger> {
    return this.http.patch<Charger>(this.url(`chargers/${charger.id}`), changes, {
      headers: ChargersApiService.ifMatch(charger),
    });
  }

  remove(charger: Charger): Observable<void> {
    return this.http.delete<void>(this.url(`chargers/${charger.id}`), {
      headers: ChargersApiService.ifMatch(charger),
    });
  }

  setPassword(charger: Charger): Observable<RegisteredCharger> {
    return this.http.post<RegisteredCharger>(this.url(`chargers/${charger.id}/password`), null, {
      headers: ChargersApiService.ifMatch(charger),
    });
  }

  removePassword(charger: Charger): Observable<RegisteredCharger> {
    return this.http.delete<RegisteredCharger>(this.url(`chargers/${charger.id}/password`), {
      headers: ChargersApiService.ifMatch(charger),
    });
  }

  resetFingerprint(charger: Charger): Observable<Charger> {
    return this.http.post<Charger>(this.url(`chargers/${charger.id}/fingerprint/reset`), null, {
      headers: ChargersApiService.ifMatch(charger),
    });
  }

  addConnector(chargerId: string, input: ConnectorInput): Observable<Connector> {
    return this.http.post<Connector>(this.url(`chargers/${chargerId}/connectors`), input);
  }

  updateConnector(connector: Connector, input: ConnectorInput): Observable<Connector> {
    return this.http.patch<Connector>(this.url(`connectors/${connector.id}`), input, {
      headers: ChargersApiService.ifMatch(connector),
    });
  }

  removeConnector(connector: Connector): Observable<void> {
    return this.http.delete<void>(this.url(`connectors/${connector.id}`), {
      headers: ChargersApiService.ifMatch(connector),
    });
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }

  private static ifMatch(row: { version: number }): Record<string, string> {
    return { 'If-Match': String(row.version) };
  }
}
