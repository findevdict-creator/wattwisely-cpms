import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { LoadManagement, LoadManagementInput } from './models/load-management';

/** Calls /v1/sites/{id}/load-management: a site's power cap and how it is shared (module 17). */
@Injectable({ providedIn: 'root' })
export class LoadManagementApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  get(siteId: string): Observable<LoadManagement> {
    return this.http.get<LoadManagement>(this.url(siteId));
  }

  /** `version` is the policy's, 0 for the first save. */
  save(siteId: string, version: number, input: LoadManagementInput): Observable<LoadManagement> {
    return this.http.put<LoadManagement>(this.url(siteId), input, {
      headers: { 'If-Match': String(version) },
    });
  }

  private url(siteId: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/sites/${siteId}/load-management`;
  }
}
