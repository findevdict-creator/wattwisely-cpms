import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { PlatformRoleDefinition, StaffMember } from './models/staff';

/** Calls /v1/admin/staff. */
@Injectable({ providedIn: 'root' })
export class StaffApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(): Observable<StaffMember[]> {
    return this.http.get<StaffMember[]>(this.url(''));
  }

  listRoles(): Observable<PlatformRoleDefinition[]> {
    return this.http.get<PlatformRoleDefinition[]>(this.url('/roles'));
  }

  add(email: string, role: string): Observable<StaffMember> {
    return this.http.post<StaffMember>(this.url(''), { email, role });
  }

  changeRole(member: StaffMember, role: string): Observable<StaffMember> {
    return this.http.patch<StaffMember>(this.url(`/${member.id}`), { role }, this.ifMatch(member));
  }

  remove(member: StaffMember): Observable<StaffMember> {
    return this.http.delete<StaffMember>(this.url(`/${member.id}`), this.ifMatch(member));
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/admin/staff${path}`;
  }

  private ifMatch(member: StaffMember) {
    return { headers: { 'If-Match': String(member.version) } };
  }
}
