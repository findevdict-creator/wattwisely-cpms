import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  DriverInvitationPreview,
  DriverMe,
  DriverOperator,
  DriverOperatorProfile,
} from './models/driver-account';

/** Calls /v1/driver, the routes behind a driver's own login (module 19). */
@Injectable({ providedIn: 'root' })
export class DriverApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  me(): Observable<DriverMe> {
    return this.http.get<DriverMe>(this.url('me'));
  }

  updateMe(changes: { display_name: string; phone: string | null }): Observable<DriverMe> {
    return this.http.patch<DriverMe>(this.url('me'), changes);
  }

  operators(): Observable<{ items: DriverOperator[] }> {
    return this.http.get<{ items: DriverOperator[] }>(this.url('operators'));
  }

  operatorProfile(tenantId: string): Observable<DriverOperatorProfile> {
    return this.http.get<DriverOperatorProfile>(this.url(`operators/${tenantId}/profile`));
  }

  /** The driver leaves the operator: it keeps its record of them, without the login. */
  leave(tenantId: string): Observable<void> {
    return this.http.delete<void>(this.url(`operators/${tenantId}`));
  }

  /** Needs no login: anyone with the link may see who invited whom. */
  invitation(token: string): Observable<DriverInvitationPreview> {
    return this.http.get<DriverInvitationPreview>(this.url(`invitations/${token}`));
  }

  accept(token: string): Observable<{ operator: DriverOperator }> {
    return this.http.post<{ operator: DriverOperator }>(
      this.url(`invitations/${token}/accept`),
      {},
    );
  }

  decline(token: string): Observable<void> {
    return this.http.post<void>(this.url(`invitations/${token}/decline`), {});
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/driver/${path}`;
  }
}
