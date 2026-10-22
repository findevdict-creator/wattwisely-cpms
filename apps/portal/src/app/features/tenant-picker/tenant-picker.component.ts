import { Component, inject } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { Router } from '@angular/router';
import { TenantMembership } from '../../core/api/models/tenant-membership';
import { TenantContextService } from '../../core/tenant/tenant-context.service';

/** Asks people who belong to several tenants which one to open (story ACC-01). */
@Component({
  selector: 'ww-tenant-picker',
  imports: [MatCardModule, MatListModule],
  templateUrl: './tenant-picker.component.html',
  styleUrl: './tenant-picker.component.scss',
})
export class TenantPickerComponent {
  protected readonly tenantContext = inject(TenantContextService);
  private readonly router = inject(Router);

  protected open(tenant: TenantMembership): void {
    this.tenantContext.selectTenant(tenant);
    void this.router.navigateByUrl('/');
  }
}
