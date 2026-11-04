import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { AuthPageComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { InvitationsApiService } from '../../core/api/invitations-api.service';
import { InvitationPreview } from '../../core/api/models/invitation';
import { AuthService } from '../../core/auth/auth.service';
import { LastTenantStore } from '../../core/tenant/last-tenant.store';

/**
 * /invitations/:token, the link in an invitation e-mail (story ACC-02). Anyone can open it.
 * Someone not logged in is sent straight on to Keycloak: to sign up when the invited address
 * has no login yet, to log in when it has; Keycloak brings them back here, and the
 * invitation is then accepted without another click. The page itself shows only when
 * something is wrong (expired, someone else's) or when the trip to Keycloak came back
 * without a login, so the person can choose the other door.
 */
@Component({
  selector: 'ww-invitation',
  imports: [AuthPageComponent, DatePipe, MatButtonModule],
  templateUrl: './invitation.component.html',
  styleUrl: './invitation.component.scss',
})
export class InvitationComponent implements OnInit {
  static readonly SENT_KEY = 'wattwisely.invitation-sent-to-keycloak';

  readonly token = input.required<string>();

  protected readonly authService = inject(AuthService);
  private readonly invitationsApi = inject(InvitationsApiService);

  protected readonly invitation = signal<InvitationPreview | null>(null);
  protected readonly problem = signal<ApiProblem | null>(null);
  protected readonly isWorking = signal(false);
  protected readonly heading = computed(() => {
    const invitation = this.invitation();
    if (this.problem()) {
      return 'This invitation cannot be used';
    }
    return invitation ? `Join ${invitation.tenant_name} on Wattwisely` : 'Your invitation';
  });
  protected readonly subtitle = computed(() => {
    const invitation = this.invitation();
    return invitation && !this.problem() ? `The invitation is for ${invitation.email}.` : '';
  });

  async ngOnInit(): Promise<void> {
    try {
      const invitation = await firstValueFrom(this.invitationsApi.preview(this.token()));
      this.invitation.set(invitation);
      await this.continueWith(invitation);
    } catch (error) {
      this.problem.set(ApiProblem.from(error));
    }
  }

  /** Logged in: accept at once. Not yet: on to Keycloak, once; back without a login, show the doors. */
  private async continueWith(invitation: InvitationPreview): Promise<void> {
    if (invitation.is_expired) {
      return;
    }
    if (this.authService.isLoggedIn()) {
      await this.accept();
    } else if (!this.wasSentToKeycloak()) {
      this.login(invitation, !invitation.has_login);
    }
  }

  protected async accept(): Promise<void> {
    this.isWorking.set(true);
    try {
      const accepted = await firstValueFrom(this.invitationsApi.accept(this.token()));
      new LastTenantStore().write(accepted.tenant.id);
      window.location.assign('/');
    } catch (error) {
      this.problem.set(ApiProblem.from(error));
      this.isWorking.set(false);
    }
  }

  protected login(invitation: InvitationPreview, isNewAccount: boolean): void {
    this.isWorking.set(true);
    sessionStorage.setItem(InvitationComponent.SENT_KEY, this.token());
    this.authService.loginAs(invitation.email, isNewAccount);
  }

  /** True when this tab already went to Keycloak for this invitation, so the page does not loop. */
  private wasSentToKeycloak(): boolean {
    return sessionStorage.getItem(InvitationComponent.SENT_KEY) === this.token();
  }
}
