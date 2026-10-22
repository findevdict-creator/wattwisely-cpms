import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  Tariff,
  TariffPage,
  TariffPreview,
  TariffPreviewRequest,
  TariffPrices,
  TariffVersion,
} from './models/tariff';

/** Calls /v1/tariffs. Changes carry the version seen, as If-Match. */
@Injectable({ providedIn: 'root' })
export class TariffsApiService {
  static readonly PAGE_SIZE = 100;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(status: 'active' | 'archived' = 'active'): Observable<TariffPage> {
    const params = new HttpParams().set('limit', TariffsApiService.PAGE_SIZE).set('status', status);
    return this.http.get<TariffPage>(this.url('tariffs'), { params });
  }

  get(id: string): Observable<Tariff> {
    return this.http.get<Tariff>(this.url(`tariffs/${id}`));
  }

  versions(id: string): Observable<TariffVersion[]> {
    return this.http.get<TariffVersion[]>(this.url(`tariffs/${id}/versions`));
  }

  create(input: { name: string; currency: string; prices: TariffPrices }): Observable<Tariff> {
    return this.http.post<Tariff>(this.url('tariffs'), input);
  }

  rename(tariff: Tariff, name: string): Observable<Tariff> {
    return this.http.patch<Tariff>(
      this.url(`tariffs/${tariff.id}`),
      { name },
      this.ifMatch(tariff),
    );
  }

  /** New prices for sessions that start from now on. */
  addVersion(tariff: Tariff, prices: TariffPrices): Observable<Tariff> {
    return this.http.post<Tariff>(
      this.url(`tariffs/${tariff.id}/versions`),
      prices,
      this.ifMatch(tariff),
    );
  }

  archive(tariff: Tariff): Observable<void> {
    return this.http.delete<void>(this.url(`tariffs/${tariff.id}`), this.ifMatch(tariff));
  }

  preview(request: TariffPreviewRequest): Observable<TariffPreview> {
    return this.http.post<TariffPreview>(this.url('tariffs/preview'), request);
  }

  private ifMatch(tariff: Tariff) {
    return { headers: { 'If-Match': String(tariff.version) } };
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
