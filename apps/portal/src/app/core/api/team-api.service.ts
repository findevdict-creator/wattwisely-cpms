import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { InviteResult, Member } from './models/member';
import { Role, RoleAssignment } from './models/role';

/** Calls /v1/members and /v1/roles: the team page (stories ACC-02 and ACC-03). */
@Injectable({ providedIn: 'root' })
export class TeamApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  listMembers(query = ''): Observable<Member[]> {
    const params = query ? new HttpParams().set('q', query) : undefined;
    return this.http.get<Member[]>(this.url('members'), { params });
  }

  listRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.url('roles'));
  }

  invite(email: string, roles: RoleAssignment[]): Observable<InviteResult> {
    return this.http.post<InviteResult>(this.url('members/invites'), { email, roles });
  }

  resendInvitation(memberId: string): Observable<InviteResult> {
    return this.http.post<InviteResult>(this.url(`members/invites/${memberId}/resend`), {});
  }

  cancelInvitation(memberId: string): Observable<void> {
    return this.http.delete<void>(this.url(`members/invites/${memberId}`));
  }

  replaceRoles(memberId: string, roles: RoleAssignment[]): Observable<Member> {
    return this.http.put<Member>(this.url(`members/${memberId}/roles`), { roles });
  }

  remove(memberId: string): Observable<void> {
    return this.http.delete<void>(this.url(`members/${memberId}`));
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
