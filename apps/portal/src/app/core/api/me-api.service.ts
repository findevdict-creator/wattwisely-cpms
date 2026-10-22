import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { Me } from './models/me';
import { MyPermissions } from './models/my-permissions';

/** Calls GET /v1/me (the user and their tenants) and GET /v1/me/permissions. */
@Injectable({ providedIn: 'root' })
export class MeApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  getMe(): Observable<Me> {
    return this.http.get<Me>(`${this.runtimeConfig.apiUrl}/v1/me`);
  }

  getPermissions(): Observable<MyPermissions> {
    return this.http.get<MyPermissions>(`${this.runtimeConfig.apiUrl}/v1/me/permissions`);
  }
}
