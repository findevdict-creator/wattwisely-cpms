import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthPageComponent } from '@wattwisely/ui';
import { AuthService } from '../../core/auth/auth.service';
import { RuntimeConfig } from '../../core/config/runtime-config';
import { StaffContextService } from '../../core/staff/staff-context.service';

/** Shown to someone who can log in but is not Wattwisely staff. No data is shown. */
@Component({
  selector: 'ww-not-staff',
  imports: [AuthPageComponent, MatButtonModule, MatIconModule],
  template: `
    <ww-auth-page heading="This console is for Wattwisely staff" width="440px">
      <span wwAuthBrand class="ww-chip dark">Staff console</span>
      <p class="ww-page-subtitle">
        You are signed in as <b>{{ staff.me()?.email || 'someone' }}</b
        >, which is not a staff account. If you run charging for a company, your workspace is in the
        tenant portal.
      </p>
      <div class="buttons">
        @if (portalUrl) {
          <a mat-flat-button class="wide" [href]="portalUrl">Go to the tenant portal</a>
        }
        <button mat-stroked-button class="wide" (click)="logout()" data-testid="logout">
          <mat-icon svgIcon="log-out" />
          Sign in with another account
        </button>
      </div>
      <p class="help">Staff who cannot get in: ask an Admin to add you on the Staff page.</p>
    </ww-auth-page>
  `,
  styles: `
    :host {
      display: block;
    }
    ww-auth-page {
      min-height: 100vh;
    }
    p {
      margin: 0;
    }
    .buttons {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .wide {
      width: 100%;
      height: 48px;
    }
    .help {
      font-size: 13px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class NotStaffComponent {
  protected readonly staff = inject(StaffContextService);
  protected readonly portalUrl = inject(RuntimeConfig).portalUrl;
  private readonly authService = inject(AuthService);

  protected logout(): void {
    this.authService.logout();
  }
}
