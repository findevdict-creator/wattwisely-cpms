import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { firstValueFrom } from 'rxjs';
import { Tenant } from '../../core/api/models/tenant';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { Initials } from '../../shared/initials';
import { PromptDialogComponent, PromptDialogData } from '../../shared/prompt-dialog.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { TenantStore } from './tenant.store';

/** The "Owners" card of a tenant: who runs the account, and a way to invite another Owner. */
@Component({
  selector: 'ww-tenant-owners',
  imports: [DatePipe, MatButtonModule, MatIconModule, StatusChipComponent],
  template: `
    <section class="ww-card" aria-labelledby="owners-title">
      <div class="ww-card-head">
        <div class="titles">
          <h2 id="owners-title">Owners</h2>
          <p>Who runs the account on the tenant's side</p>
        </div>
      </div>
      <div class="ww-card-body">
        @if (tenant().owners.length) {
          <div data-testid="owners">
            @for (owner of tenant().owners; track owner.member_id) {
              <div class="ww-list-item">
                <span class="ww-avatar">{{ initials.of(owner.name || owner.email) }}</span>
                <span class="ww-two ww-grow">
                  <b>{{ owner.name || owner.email }}</b>
                  <span>
                    {{ owner.name ? owner.email + ' · ' : '' }}
                    @if (owner.status === 'active') {
                      joined {{ owner.joined_at | date: 'd MMM y' }}
                    } @else {
                      invited {{ owner.invited_at | date: 'd MMM y' }}
                    }
                  </span>
                </span>
                <ww-status-chip [status]="owner.status" />
              </div>
            }
          </div>
        } @else {
          <p class="empty">Nobody owns this account yet. Invite the first Owner.</p>
        }
      </div>
      @if (staff.can('tenants:write') && tenant().status !== 'cancelled') {
        <div class="ww-card-foot">
          <button mat-stroked-button class="ww-small" (click)="invite()" data-testid="invite-owner">
            <mat-icon svgIcon="user-plus" />
            Invite an Owner
          </button>
        </div>
      }
    </section>
  `,
  styles: `
    .ww-list-item {
      padding: 8px 0;
    }
    .empty {
      margin: 0;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class TenantOwnersComponent {
  readonly tenant = input.required<Tenant>();
  protected readonly staff = inject(StaffContextService);
  protected readonly initials = Initials;
  private readonly store = inject(TenantStore);
  private readonly dialog = inject(MatDialog);

  protected async invite(): Promise<void> {
    const data: PromptDialogData = {
      title: `Invite an Owner to ${this.tenant().name}`,
      message: 'They get an e-mail with a link to the portal that works for 7 days.',
      label: 'E-mail address',
      confirmLabel: 'Send invitation',
    };
    const dialog = this.dialog.open(PromptDialogComponent, { data, width: '480px' });
    const email: string | undefined = await firstValueFrom(dialog.afterClosed());
    if (email) {
      await this.store.inviteOwner(email);
    }
  }
}
