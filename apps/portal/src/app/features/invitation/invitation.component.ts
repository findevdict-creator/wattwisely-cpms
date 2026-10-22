import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { InvitationsApiService } from '../../core/api/invitations-api.service';
import { InvitationPreview } from '../../core/api/models/invitation';
import { AuthService } from '../../core/auth/auth.service';
import { LastTenantStore } from '../../core/tenant/last-tenant.store';

/**
 * /invitations/:token, the link in an invitation e-mail (story ACC-02). Anyone can open it.
 * People log in (or create an account) with the invited address, then accept, and land in
 * the new company.
 */
@Component({
  selector: 'ww-invitation',
  imports: [DatePipe, MatButtonModule, MatCardModule],
  templateUrl: './invitation.component.html',
  styleUrl: './invitation.component.scss',
})
export class InvitationComponent implements OnInit {
  readonly token = input.required<string>();

  protected readonly authService = inject(AuthService);
  private readonly invitationsApi = inject(InvitationsApiService);

  protected readonly invitation = signal<InvitationPreview | null>(null);
  protected readonly problem = signal<ApiProblem | null>(null);
  protected readonly isWorking = signal(false);

  async ngOnInit(): Promise<void> {
    try {
      this.invitation.set(await firstValueFrom(this.invitationsApi.preview(this.token())));
    } catch (error) {
      this.problem.set(ApiProblem.from(error));
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
    this.authService.loginAs(invitation.email, isNewAccount);
  }
}
