import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { Site, SiteInput, SitePage } from './models/site';

/** Calls /v1/sites (story AST-01). Changes carry the version seen, as If-Match. */
@Injectable({ providedIn: 'root' })
export class SitesApiService {
  static readonly PAGE_SIZE = 100;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(
    filter: { q?: string; visibility?: string; cursor?: string | null } = {},
  ): Observable<SitePage> {
    let params = new HttpParams().set('limit', SitesApiService.PAGE_SIZE);
    for (const [key, value] of Object.entries(filter)) {
      params = value ? params.set(key, value) : params;
    }
    return this.http.get<SitePage>(this.url('sites'), { params });
  }

  get(id: string): Observable<Site> {
    return this.http.get<Site>(this.url(`sites/${id}`));
  }

  create(input: SiteInput): Observable<Site> {
    return this.http.post<Site>(this.url('sites'), input);
  }

  update(site: Site, changes: Partial<SiteInput>): Observable<Site> {
    return this.http.patch<Site>(this.url(`sites/${site.id}`), changes, {
      headers: { 'If-Match': String(site.version) },
    });
  }

  remove(site: Site): Observable<void> {
    return this.http.delete<void>(this.url(`sites/${site.id}`), {
      headers: { 'If-Match': String(site.version) },
    });
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
