import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { AcceptedInvitation } from './models/invitation';
import { Me } from './models/me';
import { MyPermissions } from './models/my-permissions';

/** Calls GET /v1/me (the user, their tenants and invitations), GET /v1/me/permissions and the accept of an invitation. */
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

  /** Accepts one of the invitations GET /v1/me listed, without the link from the e-mail. */
  acceptInvitation(id: string): Observable<AcceptedInvitation> {
    const url = `${this.runtimeConfig.apiUrl}/v1/me/invitations/${encodeURIComponent(id)}/accept`;
    return this.http.post<AcceptedInvitation>(url, {});
  }
}
