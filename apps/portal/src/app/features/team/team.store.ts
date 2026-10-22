import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Member } from '../../core/api/models/member';
import { Role } from '../../core/api/models/role';
import { Site } from '../../core/api/models/site';
import { SitesApiService } from '../../core/api/sites-api.service';
import { TeamApiService } from '../../core/api/team-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';

/**
 * The team page's data and the changes made from it. Every change reloads the list,
 * and every outcome, good or bad, is told to the user in a short message.
 */
@Injectable()
export class TeamStore {
  private readonly teamApi = inject(TeamApiService);
  private readonly sitesApi = inject(SitesApiService);
  private readonly permissions = inject(PermissionsService);
  private readonly snackBar = inject(MatSnackBar);

  readonly members = signal<Member[]>([]);
  readonly roles = signal<Role[]>([]);
  /** For site-scoped roles; empty when the user may not see sites. */
  readonly sites = signal<Site[]>([]);
  readonly isLoading = signal(true);
  private query = '';

  async load(query = this.query): Promise<void> {
    this.query = query;
    this.isLoading.set(true);
    try {
      const [members, roles, sites] = await Promise.all([
        firstValueFrom(this.teamApi.listMembers(query)),
        firstValueFrom(this.teamApi.listRoles()),
        this.loadSites(),
      ]);
      this.members.set(members);
      this.roles.set(roles);
      this.sites.set(sites);
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    } finally {
      this.isLoading.set(false);
    }
  }

  resend(member: Member): Promise<void> {
    return this.change(
      this.teamApi.resendInvitation(member.id),
      `Invitation sent to ${member.email} again.`,
    );
  }

  cancelInvitation(member: Member): Promise<void> {
    return this.change(
      this.teamApi.cancelInvitation(member.id),
      `Invitation for ${member.email} cancelled.`,
    );
  }

  remove(member: Member): Promise<void> {
    return this.change(
      this.teamApi.remove(member.id),
      `${member.name || member.email} no longer has access.`,
    );
  }

  private async loadSites(): Promise<Site[]> {
    if (!this.permissions.can('sites:read')) {
      return [];
    }
    return (await firstValueFrom(this.sitesApi.list())).items;
  }

  tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }

  private async change(request: Observable<unknown>, success: string): Promise<void> {
    try {
      await firstValueFrom(request, { defaultValue: undefined });
      this.tell(success);
      await this.load();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }
}
