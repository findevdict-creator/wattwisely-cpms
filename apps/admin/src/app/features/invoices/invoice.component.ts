import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, effect, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { InvoiceLine } from '../../core/api/models/invoice';
import { StaffContextService } from '../../core/staff/staff-context.service';
import { PageTitleService } from '../../layout/page-title.service';
import { ConfirmDialogComponent, ConfirmDialogData } from '../../shared/confirm-dialog.component';
import { Money } from '../../shared/money';
import { MoneyPipe } from '../../shared/money.pipe';
import { PromptDialogComponent } from '../../shared/prompt-dialog.component';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { AdjustmentDialogComponent } from './adjustment-dialog.component';
import { InvoiceHistoryComponent } from './invoice-history.component';
import { InvoiceStore } from './invoice.store';
import { PayDialogComponent } from './pay-dialog.component';

/** One invoice: its lines and totals, and what staff do with it next (issue, settle, void, adjust). */
@Component({
  selector: 'ww-invoice',
  imports: [
    DatePipe,
    InvoiceHistoryComponent,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatTableModule,
    MoneyPipe,
    PageHeaderComponent,
    RouterLink,
    StatusChipComponent,
  ],
  providers: [InvoiceStore],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss',
})
export class InvoiceComponent implements OnInit {
  readonly id = input.required<string>();
  protected readonly store = inject(InvoiceStore);
  protected readonly staff = inject(StaffContextService);
  private readonly dialog = inject(MatDialog);

  protected readonly columns = ['description', 'quantity', 'unit_price', 'amount', 'remove'];
  protected readonly canWrite = computed(() => this.staff.can('billing:write'));
  protected readonly isDraft = computed(() => this.store.invoice()?.status === 'draft');
  protected readonly status = computed(() => {
    const invoice = this.store.invoice();
    return invoice?.is_overdue ? 'overdue' : (invoice?.status ?? null);
  });

  constructor() {
    const pageTitle = inject(PageTitleService);
    effect(() => {
      const invoice = this.store.invoice();
      pageTitle.set(invoice ? (invoice.number ?? `Draft, ${invoice.tenant_name}`) : '');
    });
  }

  ngOnInit(): void {
    void this.store.load(this.id());
  }

  protected async addLine(): Promise<void> {
    const dialog = this.dialog.open(AdjustmentDialogComponent, {
      data: { currency: this.store.current().currency },
      width: '480px',
    });
    const line = await firstValueFrom(dialog.afterClosed());
    if (line) {
      await this.store.addLine(line);
    }
  }

  protected async removeLine(line: InvoiceLine): Promise<void> {
    if (
      await this.confirm({
        title: `Remove "${line.description}"?`,
        message: '',
        confirmLabel: 'Remove',
      })
    ) {
      await this.store.removeLine(line.id);
    }
  }

  protected async regenerate(): Promise<void> {
    const isConfirmed = await this.confirm({
      title: 'Work the fee lines out again?',
      message:
        'The plan, connector, add-on, managed service and revenue share lines are replaced with what today’s plan, size, prices and tax rate give. Lines you added stay.',
      confirmLabel: 'Regenerate',
    });
    if (isConfirmed) {
      await this.store.regenerate();
    }
  }

  protected async issue(): Promise<void> {
    const invoice = this.store.current();
    const isConfirmed = await this.confirm({
      title: `Issue the invoice for ${invoice.month_label}?`,
      message: `It gets its number, is due in 30 days and goes to ${invoice.billing_email ?? 'nobody (the tenant has no billing e-mail)'}. The tenant sees it in the portal. Afterwards it can only be voided.`,
      confirmLabel: 'Issue',
    });
    if (isConfirmed) {
      await this.store.issue();
    }
  }

  protected async pay(): Promise<void> {
    const invoice = this.store.current();
    const dialog = this.dialog.open(PayDialogComponent, {
      data: { number: invoice.number, total: Money.format(invoice.total, invoice.currency) },
      width: '480px',
    });
    const body = await firstValueFrom(dialog.afterClosed());
    if (body) {
      await this.store.pay(body);
    }
  }

  protected async voidInvoice(): Promise<void> {
    const dialog = this.dialog.open(PromptDialogComponent, {
      data: {
        title: `Void ${this.store.current().number ?? 'this draft'}?`,
        message:
          'A void invoice stays on record and is shown to the tenant as cancelled. The month can be drafted again. The reason goes to the audit log.',
        label: 'Reason',
        confirmLabel: 'Void',
      },
      width: '480px',
    });
    const reason: string | undefined = await firstValueFrom(dialog.afterClosed());
    if (reason) {
      await this.store.void(reason);
    }
  }

  private confirm(data: ConfirmDialogData): Promise<boolean> {
    const dialog = this.dialog.open(ConfirmDialogComponent, { data, width: '440px' });
    return firstValueFrom(dialog.afterClosed());
  }
}
