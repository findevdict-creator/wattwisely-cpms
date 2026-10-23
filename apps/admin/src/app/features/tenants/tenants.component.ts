import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Plan } from '../../core/api/models/plan';
import { TenantSummary } from '../../core/api/models/tenant';
import { PlansApiService } from '../../core/api/plans-api.service';
import { TenantFilter, TenantsApiService } from '../../core/api/tenants-api.service';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { NewTenantDialogComponent } from './new-tenant-dialog.component';

/** Tenants: every company on the platform, searchable, with a button to add one. */
@Component({
  selector: 'ww-tenants',
  imports: [
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTableModule,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './tenants.component.html',
  styleUrl: './tenants.component.scss',
})
export class TenantsComponent implements OnInit {
  protected readonly staff = inject(StaffContextService);
  private readonly tenantsApi = inject(TenantsApiService);
  private readonly plansApi = inject(PlansApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly columns = ['tenant', 'status', 'plan', 'usage', 'created'];
  protected readonly statuses = ['trial', 'active', 'suspended', 'cancelled'];
  protected readonly tenants = signal<TenantSummary[]>([]);
  protected readonly plans = signal<Plan[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly filter = signal<TenantFilter>({});

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filter.set({ plan: params.get('plan') ?? '', status: params.get('status') ?? '' });
    void this.load();
    void this.loadPlans();
  }

  protected change(change: TenantFilter): void {
    this.filter.update((filter) => ({ ...filter, ...change }));
    void this.load();
  }

  protected async load(cursor: string | null = null): Promise<void> {
    try {
      const page = await firstValueFrom(this.tenantsApi.list({ ...this.filter(), cursor }));
      this.tenants.update((tenants) => (cursor ? [...tenants, ...page.items] : page.items));
      this.nextCursor.set(page.next_cursor);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected async create(): Promise<void> {
    const dialog = this.dialog.open(NewTenantDialogComponent, {
      data: { plans: this.plans().filter((plan) => plan.is_active) },
      width: '600px',
    });
    const created = await firstValueFrom(dialog.afterClosed());
    if (created) {
      const sent = created.is_owner_email_sent;
      const note =
        sent === null
          ? ''
          : sent
            ? ' The Owner has been invited by e-mail.'
            : ' The Owner e-mail could not be sent; invite them again from the tenant page.';
      this.snackBar.open(`${created.tenant.name} created.${note}`, 'OK', { duration: 8000 });
      await this.router.navigate(['/tenants', created.tenant.id]);
    }
  }

  private async loadPlans(): Promise<void> {
    if (this.staff.can('plans:read')) {
      this.plans.set(await firstValueFrom(this.plansApi.listPlans()));
    }
  }
}
