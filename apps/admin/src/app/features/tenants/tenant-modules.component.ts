import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { firstValueFrom } from 'rxjs';
import { SetModuleRequest, Tenant, TenantModule } from '../../core/api/models/tenant';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { ModuleDialogComponent } from './module-dialog.component';
import { TenantStore } from './tenant.store';

/** The modules a tenant has: from the plan, as add-ons, on trial or by override; staff switch them. */
@Component({
  selector: 'ww-tenant-modules',
  imports: [DatePipe, MatButtonModule, MatIconModule, MatMenuModule, MatTableModule, MoneyPipe],
  templateUrl: './tenant-modules.component.html',
  styleUrl: './tenant-modules.component.scss',
})
export class TenantModulesComponent {
  static readonly SOURCE_LABELS: Record<string, string> = {
    core: 'Core, always on',
    plan: 'In the plan',
    addon: 'Add-on',
    trial: 'Trial',
    override: 'Set by Wattwisely',
  };
  static readonly UNIT_LABELS: Record<string, string> = {
    per_connector: 'per connector',
    per_site: 'per site',
    per_tenant: 'per month',
  };

  readonly tenant = input.required<Tenant>();
  protected readonly staff = inject(StaffContextService);
  private readonly store = inject(TenantStore);
  private readonly dialog = inject(MatDialog);
  protected readonly columns = ['module', 'source', 'price', 'state', 'actions'];

  protected describeSource(module: TenantModule): string {
    if (!module.is_enabled) {
      return module.source === 'override' ? 'Taken away by Wattwisely' : 'Not in the plan';
    }
    return TenantModulesComponent.SOURCE_LABELS[module.source ?? ''] ?? '';
  }

  protected unitOf(module: TenantModule): string {
    return TenantModulesComponent.UNIT_LABELS[module.price?.pricing_unit ?? ''] ?? '';
  }

  protected canChange(module: TenantModule): boolean {
    return (
      module.kind !== 'core' &&
      this.staff.can('tenants:write') &&
      this.tenant().status !== 'cancelled'
    );
  }

  /** Switched on or off by staff: as an add-on, a trial, or an override. */
  protected async change(module: TenantModule, isEnabled: boolean): Promise<void> {
    const dialog = this.dialog.open(ModuleDialogComponent, {
      data: { module, isEnabled },
      width: '480px',
    });
    const body: SetModuleRequest | undefined = await firstValueFrom(dialog.afterClosed());
    if (body) {
      await this.store.setModule(module.key, body);
    }
  }

  protected reset(module: TenantModule): Promise<void> {
    return this.store.resetModule(module.key);
  }
}
