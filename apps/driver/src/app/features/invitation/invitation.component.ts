import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterLink } from '@angular/router';
import { InvitationStore } from '@wattwisely/driver-core';
import { DriverAuthService } from '../../core/auth/driver-auth.service';
import { BrandService } from '../../core/branding/brand.service';

/**
 * Where an operator's invitation e-mail leads (module 19, story DRV-04): who invites whom,
 * then the way in. Without a login the page offers to create one, or to log in, with the
 * invited address filled in; with one, the invitation is accepted or declined here.
 */
@Component({
  selector: 'ww-invitation',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  providers: [InvitationStore],
  templateUrl: './invitation.component.html',
  styleUrl: './invitation.component.scss',
})
export class InvitationComponent implements OnInit {
  readonly token = input.required<string>();

  protected readonly store = inject(InvitationStore);
  protected readonly auth = inject(DriverAuthService);
  private readonly router = inject(Router);

  protected readonly isLoggedIn = computed(() => this.auth.isLoggedIn());
  /** The login's address when it is not the one invited; empty when it is, or when logged out. */
  protected readonly otherLogin = computed(() => {
    const invited = this.store.invitation()?.email.toLowerCase() ?? '';
    const login = this.auth.email();
    return this.isLoggedIn() && login.toLowerCase() !== invited ? login : '';
  });

  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    void this.store.load(this.token());
  }

  protected signUp(): void {
    this.auth.loginAs(this.store.invitation()?.email ?? '', true);
  }

  protected logIn(): void {
    this.auth.loginAs(this.store.invitation()?.email ?? '', false);
  }

  protected async accept(): Promise<void> {
    const operator = await this.store.accept(this.token());
    if (operator) {
      await this.router.navigate(['/account/operators', operator.tenant_id], {
        queryParams: { linked: 1 },
      });
    }
  }

  protected decline(): void {
    void this.store.decline(this.token());
  }
}
