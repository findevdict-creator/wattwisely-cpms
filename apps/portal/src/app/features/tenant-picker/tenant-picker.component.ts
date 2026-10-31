import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { AuthPageComponent } from '@wattwisely/ui';
import { TenantMembership } from '../../core/api/models/tenant-membership';
import { AuthService } from '../../core/auth/auth.service';
import { LastTenantStore } from '../../core/tenant/last-tenant.store';
import { TenantContextService } from '../../core/tenant/tenant-context.service';
import { Initials } from '../../shared/initials';

/** Asks people who belong to several tenants which one to open (story ACC-01). */
@Component({
  selector: 'ww-tenant-picker',
  imports: [AuthPageComponent, MatIconModule],
  templateUrl: './tenant-picker.component.html',
  styleUrl: './tenant-picker.component.scss',
})
export class TenantPickerComponent {
  protected readonly tenantContext = inject(TenantContextService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly initials = Initials;
  /** The workspace opened last time on this browser, marked in the list. */
  protected readonly lastTenantId = new LastTenantStore().read();
  protected readonly subtitle = computed(() => {
    const count = this.tenantContext.tenants().length;
    return `You're a member of ${count} ${count === 1 ? 'company' : 'companies'}. You can switch any time from the side menu.`;
  });

  protected open(tenant: TenantMembership): void {
    this.tenantContext.selectTenant(tenant);
    void this.router.navigateByUrl('/');
  }

  protected logout(): void {
    this.authService.logout();
  }
}
