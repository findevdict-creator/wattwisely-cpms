import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AuthService } from '../../core/auth/auth.service';

/** Shown to someone who can log in but belongs to no tenant (story ACC-01). No data is shown. */
@Component({
  selector: 'ww-no-workspace',
  imports: [MatButtonModule, MatCardModule],
  templateUrl: './no-workspace.component.html',
  styleUrl: './no-workspace.component.scss',
})
export class NoWorkspaceComponent {
  private readonly authService = inject(AuthService);

  protected logout(): void {
    this.authService.logout();
  }
}
