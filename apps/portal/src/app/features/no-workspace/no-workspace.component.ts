import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthPageComponent } from '@wattwisely/ui';
import { AuthService } from '../../core/auth/auth.service';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

/** Shown to someone who can log in but belongs to no tenant (story ACC-01). No data is shown. */
@Component({
  selector: 'ww-no-workspace',
  imports: [AuthPageComponent, MatButtonModule, MatIconModule],
  templateUrl: './no-workspace.component.html',
  styleUrl: './no-workspace.component.scss',
})
export class NoWorkspaceComponent {
  private readonly authService = inject(AuthService);
  private readonly tenantContext = inject(TenantContextService);
  protected readonly email = computed(() => this.tenantContext.me()?.email ?? '');

  protected logout(): void {
    this.authService.logout();
  }
}
