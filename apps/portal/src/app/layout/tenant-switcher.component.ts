import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { TenantMembership } from '../core/api/models/tenant-membership';
import { PermissionsService } from '../core/permissions/permissions.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { Initials } from '../shared/initials';

/**
 * The workspace at the head of the side menu and, for people in several, a menu to switch
 * (story ACC-04). Switching reloads the page so nothing from the previous tenant stays on screen.
 */
@Component({
  selector: 'ww-tenant-switcher',
  imports: [MatIconModule, MatMenuModule, NgTemplateOutlet],
  templateUrl: './tenant-switcher.component.html',
  styleUrl: './tenant-switcher.component.scss',
})
export class TenantSwitcherComponent {
  protected readonly tenantContext = inject(TenantContextService);
  private readonly permissions = inject(PermissionsService);

  protected readonly initials = Initials;
  /** The plan, or the user's roles when the tenant has none. */
  protected readonly line = computed(() => {
    const plan = this.permissions.plan();
    return plan ? `${plan.name} plan` : this.permissions.roleNames().join(', ');
  });

  protected switchTo(tenant: TenantMembership): void {
    if (tenant.id === this.tenantContext.currentTenantId()) {
      return;
    }
    this.tenantContext.selectTenant(tenant);
    window.location.assign('/');
  }
}
