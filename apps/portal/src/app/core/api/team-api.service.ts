import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { InviteResult, Member } from './models/member';
import { Permission, Role, RoleAssignment, RoleInput } from './models/role';

/**
 * Calls /v1/members, /v1/roles and /v1/permissions: the team page (stories ACC-02 and
 * ACC-03) and the roles page with its permission matrix (module 14).
 */
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

  listPermissions(): Observable<Permission[]> {
    return this.http.get<Permission[]>(this.url('permissions'));
  }

  createRole(input: RoleInput): Observable<Role> {
    return this.http.post<Role>(this.url('roles'), input);
  }

  /** Changes carry the version seen, as If-Match, so two people cannot overwrite each other. */
  updateRole(role: Role, changes: Partial<RoleInput>): Observable<Role> {
    return this.http.patch<Role>(this.url(`roles/${role.id}`), changes, {
      headers: { 'If-Match': String(role.version) },
    });
  }

  removeRole(role: Role): Observable<void> {
    return this.http.delete<void>(this.url(`roles/${role.id}`), {
      headers: { 'If-Match': String(role.version) },
    });
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
