import { DatePipe } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { firstValueFrom } from 'rxjs';
import { Tenant } from '../../core/api/models/tenant';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { PromptDialogComponent, PromptDialogData } from '../../shared/prompt-dialog.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { TenantStore } from './tenant.store';

/** The "Owners" card of a tenant: who runs the account, and a way to invite another Owner. */
@Component({
  selector: 'ww-tenant-owners',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatListModule, StatusChipComponent],
  template: `
    <mat-card>
      <mat-card-header>
        <mat-card-title>Owners</mat-card-title>
      </mat-card-header>
      <mat-card-content>
        @if (tenant().owners.length) {
          <mat-list data-testid="owners">
            @for (owner of tenant().owners; track owner.member_id) {
              <mat-list-item>
                <span matListItemTitle>{{ owner.name || owner.email }}</span>
                <span matListItemLine>
                  {{ owner.email }} ·
                  @if (owner.status === 'active') {
                    joined {{ owner.joined_at | date: 'mediumDate' }}
                  } @else {
                    invited {{ owner.invited_at | date: 'mediumDate' }}
                  }
                </span>
                <ww-status-chip matListItemMeta [status]="owner.status" />
              </mat-list-item>
            }
          </mat-list>
        } @else {
          <p class="empty">Nobody owns this account yet. Invite the first Owner.</p>
        }
      </mat-card-content>
      @if (staff.can('tenants:write') && tenant().status !== 'cancelled') {
        <mat-card-actions align="end">
          <button mat-button (click)="invite()" data-testid="invite-owner">Invite an Owner</button>
        </mat-card-actions>
      }
    </mat-card>
  `,
})
export class TenantOwnersComponent {
  readonly tenant = input.required<Tenant>();
  protected readonly staff = inject(StaffContextService);
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
