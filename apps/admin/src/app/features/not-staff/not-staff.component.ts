import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/auth/auth.service';
import { StaffContextService } from '../../core/staff/staff-context.service';

/** Shown to someone who can log in but is not Wattwisely staff. No data is shown. */
@Component({
  selector: 'ww-not-staff',
  imports: [MatButtonModule, MatCardModule],
  template: `
    <mat-card class="card">
      <mat-card-header>
        <mat-card-title>This console is for Wattwisely staff</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <p>
          You are logged in as <strong>{{ staff.me()?.email }}</strong
          >, but this account has no staff role. If you run charging for a company, use the
          Wattwisely portal instead. If you work at Wattwisely, ask an administrator to add you.
        </p>
      </mat-card-content>
      <mat-card-actions align="end">
        <button mat-flat-button (click)="logout()" data-testid="logout">Log out</button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: `
    .card {
      max-width: 520px;
      margin: 80px auto;
    }
  `,
})
export class NotStaffComponent {
  protected readonly staff = inject(StaffContextService);
  private readonly authService = inject(AuthService);

  protected logout(): void {
    this.authService.logout();
  }
}
