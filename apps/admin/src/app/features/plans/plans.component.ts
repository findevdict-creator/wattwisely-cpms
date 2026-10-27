import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Addon, Plan, ProductModule } from '../../core/api/models/plan';
import { PlansApiService } from '../../core/api/plans-api.service';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { AddonDialogComponent } from './addon-dialog.component';
import { PlanDialogComponent } from './plan-dialog.component';

/** Plans: the catalogue tenants are sold, with fees, limits and modules; and the add-on prices. */
@Component({
  selector: 'ww-plans',
  imports: [MatButtonModule, MatIconModule, MatTableModule, MoneyPipe, PageHeaderComponent],
  templateUrl: './plans.component.html',
  styleUrl: './plans.component.scss',
})
export class PlansComponent implements OnInit {
  protected readonly staff = inject(StaffContextService);
  private readonly plansApi = inject(PlansApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly planColumns = [
    'plan',
    'platform',
    'ac',
    'dc',
    'share',
    'limits',
    'tenants',
    'state',
    'actions',
  ];
  protected readonly addonColumns = ['addon', 'price', 'state', 'actions'];
  protected readonly plans = signal<Plan[]>([]);
  protected readonly addons = signal<Addon[]>([]);
  protected readonly modules = signal<ProductModule[]>([]);
  protected readonly error = signal('');

  ngOnInit(): void {
    void this.load();
  }

  protected moduleNames(plan: Plan): string {
    const names = plan.module_keys.map(
      (key) => this.modules().find((module) => module.key === key)?.name ?? key,
    );
    return names.length ? names.join(', ') : 'Core modules only';
  }

  /** "250 connectors · 20 users", or "No limit". */
  protected limitsOf(plan: Plan): string {
    const limits = [
      plan.connector_limit === null ? '' : `${plan.connector_limit} connectors`,
      plan.user_limit === null ? '' : `${plan.user_limit} users`,
    ].filter(Boolean);
    return limits.length ? limits.join(' · ') : 'No limit';
  }

  protected unitOf(addon: Addon): string {
    return { per_connector: 'per connector', per_site: 'per site', per_tenant: 'per month' }[
      addon.pricing_unit
    ];
  }

  protected async editPlan(plan: Plan | null): Promise<void> {
    const dialog = this.dialog.open(PlanDialogComponent, {
      data: { plan, modules: this.modules().filter((module) => module.kind === 'plan') },
      width: '640px',
    });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.snackBar.open(plan ? 'Plan saved.' : 'Plan created.', 'OK', { duration: 6000 });
      await this.load();
    }
  }

  protected async editAddon(addon: Addon): Promise<void> {
    const dialog = this.dialog.open(AddonDialogComponent, { data: addon, width: '480px' });
    if (await firstValueFrom(dialog.afterClosed())) {
      this.snackBar.open('Add-on saved.', 'OK', { duration: 6000 });
      await this.load();
    }
  }

  private async load(): Promise<void> {
    try {
      const [plans, addons, modules] = await Promise.all([
        firstValueFrom(this.plansApi.listPlans()),
        firstValueFrom(this.plansApi.listAddons()),
        firstValueFrom(this.plansApi.listModules()),
      ]);
      this.plans.set(plans);
      this.addons.set(addons);
      this.modules.set(modules);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
