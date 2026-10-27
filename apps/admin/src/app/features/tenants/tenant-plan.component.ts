import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { SetSubscriptionRequest, Tenant } from '../../core/api/models/tenant';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { LimitPipe } from '../../shared/limit.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { SubscriptionDialogComponent } from './subscription-dialog.component';
import { TenantStore } from './tenant.store';

/** The "Plan and billing" card of a tenant: plan, subscription state, billing contact and usage against limits. */
@Component({
  selector: 'ww-tenant-plan',
  imports: [DatePipe, LimitPipe, MatButtonModule, MatIconModule, StatusChipComponent],
  templateUrl: './tenant-plan.component.html',
  styles: `
    dd {
      font-weight: 500;
    }
    .faint {
      font-weight: 400;
      color: var(--mat-sys-on-surface-variant);
    }
    .extra {
      display: block;
      font-size: 13px;
    }
    .over {
      color: var(--ww-danger-text);
    }
    .notes {
      font-weight: 400;
      white-space: pre-wrap;
    }
  `,
})
export class TenantPlanComponent {
  readonly tenant = input.required<Tenant>();
  protected readonly staff = inject(StaffContextService);
  private readonly store = inject(TenantStore);
  private readonly dialog = inject(MatDialog);

  protected isOver(used: number, limit: number | null): boolean {
    return limit !== null && used > limit;
  }

  protected async change(): Promise<void> {
    const dialog = this.dialog.open(SubscriptionDialogComponent, {
      data: this.tenant(),
      width: '600px',
    });
    const body: SetSubscriptionRequest | undefined = await firstValueFrom(dialog.afterClosed());
    if (body) {
      await this.store.setSubscription(body);
    }
  }
}
