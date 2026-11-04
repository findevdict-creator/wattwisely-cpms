import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthPageComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { MeApiService } from '../../core/api/me-api.service';
import { PendingInvitation } from '../../core/api/models/invitation';
import { AuthService } from '../../core/auth/auth.service';
import { LastTenantStore } from '../../core/tenant/last-tenant.store';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

/**
 * Shown to someone who can log in but belongs to no tenant (story ACC-01). When an
 * invitation is waiting for their verified address, it is accepted here: the only one at
 * once, several from a list. That rescues a sign-up whose e-mail verification ended in
 * another browser tab, where the link from the invitation e-mail is no longer known.
 */
@Component({
  selector: 'ww-no-workspace',
  imports: [AuthPageComponent, MatButtonModule, MatIconModule],
  templateUrl: './no-workspace.component.html',
  styleUrl: './no-workspace.component.scss',
})
export class NoWorkspaceComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly meApi = inject(MeApiService);
  private readonly tenantContext = inject(TenantContextService);

  protected readonly email = computed(() => this.tenantContext.me()?.email ?? '');
  protected readonly invitations = computed(() => this.tenantContext.me()?.invitations ?? []);
  protected readonly accepting = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly heading = computed(() =>
    this.invitations().length > 0 ? 'You have been invited' : 'No workspace yet',
  );
  protected readonly subtitle = computed(() =>
    this.invitations().length > 0
      ? 'Your login works. Accept an invitation to open the company.'
      : 'Your login works, but you are not a member of any company on Wattwisely yet.',
  );

  ngOnInit(): void {
    const [only, ...others] = this.invitations();
    if (only && others.length === 0) {
      void this.accept(only);
    }
  }

  protected async accept(invitation: PendingInvitation): Promise<void> {
    this.accepting.set(invitation.id);
    this.error.set('');
    try {
      const accepted = await firstValueFrom(this.meApi.acceptInvitation(invitation.id));
      new LastTenantStore().write(accepted.tenant.id);
      window.location.assign('/');
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
      this.accepting.set(null);
    }
  }

  protected logout(): void {
    this.authService.logout();
  }
}
