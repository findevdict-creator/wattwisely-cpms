import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { AcceptedInvitation, InvitationPreview } from './models/invitation';

/** Calls /v1/invitations/{token}: the invitee's side of an invitation. */
@Injectable({ providedIn: 'root' })
export class InvitationsApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  preview(token: string): Observable<InvitationPreview> {
    return this.http.get<InvitationPreview>(this.url(token));
  }

  accept(token: string): Observable<AcceptedInvitation> {
    return this.http.post<AcceptedInvitation>(`${this.url(token)}/accept`, {});
  }

  private url(token: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/invitations/${encodeURIComponent(token)}`;
  }
}
