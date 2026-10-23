import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { firstValueFrom } from 'rxjs';
import { SetSubscriptionRequest, Tenant } from '../../core/api/models/tenant';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { LimitPipe } from '../../shared/limit.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { SubscriptionDialogComponent } from './subscription-dialog.component';
import { TenantStore } from './tenant.store';

/** The "Plan & billing" card of a tenant: plan, subscription state, billing contact and usage against limits. */
@Component({
  selector: 'ww-tenant-plan',
  imports: [DatePipe, LimitPipe, MatButtonModule, MatCardModule, StatusChipComponent],
  templateUrl: './tenant-plan.component.html',
  styles: `
    dl {
      display: grid;
      grid-template-columns: max-content 1fr;
      gap: 6px 16px;
      margin: 0;
    }
    dt {
      color: var(--mat-sys-on-surface-variant);
    }
    dd {
      margin: 0;
    }
    .over {
      color: var(--mat-sys-error);
      font-weight: 500;
    }
    .notes {
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
