import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { AccessGroup, AccessGroupInput } from './models/driver';

/** Calls /v1/access-groups (story AST-04). Changes carry the version seen, as If-Match. */
@Injectable({ providedIn: 'root' })
export class AccessGroupsApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(): Observable<{ items: AccessGroup[] }> {
    return this.http.get<{ items: AccessGroup[] }>(this.url('access-groups'));
  }

  create(input: AccessGroupInput): Observable<AccessGroup> {
    return this.http.post<AccessGroup>(this.url('access-groups'), input);
  }

  update(group: AccessGroup, changes: Partial<AccessGroupInput>): Observable<AccessGroup> {
    return this.http.patch<AccessGroup>(this.url(`access-groups/${group.id}`), changes, {
      headers: { 'If-Match': String(group.version) },
    });
  }

  remove(group: AccessGroup): Observable<void> {
    return this.http.delete<void>(this.url(`access-groups/${group.id}`), {
      headers: { 'If-Match': String(group.version) },
    });
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
