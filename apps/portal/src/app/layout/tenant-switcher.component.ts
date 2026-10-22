import { Component, inject } from '@angular/core';
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { TenantMembership } from '../core/api/models/tenant-membership';

/**
 * Shows the current tenant and, for people in several tenants, lets them switch (story ACC-04).
 * Switching reloads the page so nothing from the previous tenant stays on screen.
 */
@Component({
  selector: 'ww-tenant-switcher',
  imports: [MatSelectModule],
  templateUrl: './tenant-switcher.component.html',
  styleUrl: './tenant-switcher.component.scss',
})
export class TenantSwitcherComponent {
  protected readonly tenantContext = inject(TenantContextService);

  protected switchTo(change: MatSelectChange<TenantMembership>): void {
    this.tenantContext.selectTenant(change.value);
    window.location.assign('/');
  }
}
