import { DatePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { Refund } from '../../core/api/models/payment';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { StatusLabels } from '../../shared/status-labels';
import { PaymentAccountCardComponent } from './payment-account-card.component';
import { PaymentsStore } from './payments.store';

/** Payments: the company's Stripe account, refunds waiting for approval, and every card payment. */
@Component({
  selector: 'ww-payments',
  imports: [
    DatePipe,
    EmptyStateComponent,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    MoneyPipe,
    PageHeaderComponent,
    PaymentAccountCardComponent,
    RouterLink,
    StatusChipComponent,
  ],
  providers: [PaymentsStore],
  templateUrl: './payments.component.html',
  styleUrl: './payments.component.scss',
})
export class PaymentsComponent implements OnInit {
  static readonly STATUS_FILTERS = [
    { value: 'pending,authorised', label: 'Holds in progress' },
    { value: 'captured,partially_refunded,refunded', label: 'Taken' },
    { value: 'released', label: 'Released' },
    { value: 'failed,capture_failed', label: 'Failed' },
  ];

  protected readonly store = inject(PaymentsStore);
  protected readonly permissions = inject(PermissionsService);

  protected readonly columns = ['created_at', 'where', 'card', 'hold', 'taken', 'status', 'flags'];
  protected readonly queueColumns = ['requested_at', 'reason', 'amount', 'actions'];
  protected readonly statusFilters = PaymentsComponent.STATUS_FILTERS;
  protected readonly flagLabel = StatusLabels.reviewFlag;

  ngOnInit(): void {
    if (this.permissions.can('payments:read')) {
      void this.store.load();
      void this.store.loadQueue();
    }
  }

  protected filterBy(status: string): void {
    void this.store.load({ ...this.store.filter(), status: status || undefined });
  }

  protected decide(refund: Refund, decision: 'approve' | 'cancel'): void {
    void this.store.decide(refund, decision);
  }

  protected flagsOf(flags: string[]): string {
    return flags.map((flag) => StatusLabels.reviewFlag(flag)).join(', ');
  }
}
