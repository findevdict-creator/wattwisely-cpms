import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AccountManager, ManagedOperator } from '../../core/api/models/managed-service';
import { Tenant } from '../../core/api/models/tenant';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog.component';
import { Initials } from '../../shared/initials';
import { PromptDialogComponent } from '../../shared/prompt-dialog.component';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { AssignOperatorDialogComponent } from './assign-operator-dialog.component';
import { ManagedServiceDialogComponent } from './managed-service-dialog.component';
import { ManagedServiceStore } from './managed-service.store';

/**
 * The "Managed service" card of a tenant (module 10): the agreement, its account manager
 * and the staff working in the tenant; offer, change, withdraw, give notice, assign.
 */
@Component({
  selector: 'ww-tenant-managed-service',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MoneyPipe,
    RouterLink,
    StatusChipComponent,
  ],
  providers: [ManagedServiceStore],
  templateUrl: './tenant-managed-service.component.html',
  styleUrl: './tenant-managed-service.component.scss',
})
export class TenantManagedServiceComponent implements OnInit {
  readonly tenant = input.required<Tenant>();
  protected readonly store = inject(ManagedServiceStore);
  protected readonly staff = inject(StaffContextService);
  private readonly dialog = inject(MatDialog);
  protected readonly initials = Initials;

  protected readonly canManage = computed(
    () => this.staff.can('tenants:manage_service') && this.tenant().status !== 'cancelled',
  );
  /** The fee is in the plan's currency. */
  protected readonly currency = computed(() => this.tenant().subscription.plan?.currency ?? 'USD');
  /** An agreement that is offered or in force; a new one can be offered otherwise. */
  protected readonly isLive = computed(() => {
    const status = this.store.service()?.status;
    return status === 'pending_acceptance' || status === 'active' || status === 'ending';
  });

  ngOnInit(): void {
    void this.store.load(this.tenant().id);
  }

  protected initialsOf(manager: AccountManager | null): string {
    return manager ? Initials.of(manager.name || manager.email) : '–';
  }

  protected async offer(): Promise<void> {
    const terms = await this.askTerms(false);
    if (terms) {
      await this.store.offer(terms);
    }
  }

  protected async edit(): Promise<void> {
    const terms = await this.askTerms(true);
    if (terms) {
      await this.store.update(terms);
    }
  }

  protected async withdraw(): Promise<void> {
    const isConfirmed = await this.confirm({
      title: 'Withdraw the offer?',
      message: 'The Owners can no longer accept it. You can offer again later.',
      confirmLabel: 'Withdraw',
    });
    if (isConfirmed) {
      await this.store.withdraw();
    }
  }

  protected async giveNotice(): Promise<void> {
    const dialog = this.dialog.open(PromptDialogComponent, {
      data: {
        title: `End the managed service for ${this.tenant().name}?`,
        message:
          'The service ends 30 days from now. Until then everything stays as it is; afterwards the Managed operators lose access. The reason goes to the audit log.',
        label: 'Reason',
        confirmLabel: 'Give notice',
      },
      width: '480px',
    });
    const reason: string | undefined = await firstValueFrom(dialog.afterClosed());
    if (reason) {
      await this.store.giveNotice({ reason });
    }
  }

  protected async addOperator(): Promise<void> {
    const assignedStaffIds = this.store
      .current()
      .operators.map((operator) => operator.staff_id)
      .filter((id): id is string => id !== null);
    const dialog = this.dialog.open(AssignOperatorDialogComponent, {
      data: { tenantName: this.tenant().name, assignedStaffIds },
      width: '480px',
    });
    const staffId: string | undefined = await firstValueFrom(dialog.afterClosed());
    if (staffId) {
      await this.store.assignOperator(staffId);
    }
  }

  protected async removeOperator(operator: ManagedOperator): Promise<void> {
    const isConfirmed = await this.confirm({
      title: `Remove ${operator.name || operator.email} from ${this.tenant().name}?`,
      message:
        'They lose access to the tenant within a minute. Their actions stay in its audit log.',
      confirmLabel: 'Remove',
    });
    if (isConfirmed && operator.staff_id) {
      await this.store.removeOperator(operator.staff_id);
    }
  }

  private async askTerms(isEdit: boolean) {
    const dialog = this.dialog.open(ManagedServiceDialogComponent, {
      data: {
        tenantName: this.tenant().name,
        service: isEdit ? this.store.current() : null,
        currency: this.tenant().subscription.plan?.currency ?? 'USD',
      },
      width: '560px',
    });
    return firstValueFrom(dialog.afterClosed());
  }

  private async confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialog = this.dialog.open(ConfirmDialogComponent, { data, width: '440px' });
    return (await firstValueFrom(dialog.afterClosed())) === true;
  }
}
