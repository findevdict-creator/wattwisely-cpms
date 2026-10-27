import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { InvoiceFilter, InvoicesApiService } from '../../core/api/invoices-api.service';
import { InvoiceListStatus, InvoiceSummary } from '../../core/api/models/invoice';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { InvoiceMonths } from './invoice-months';

/** Invoices (module 15): every tenant's invoices, newest month first, narrowed by state or month. */
@Component({
  selector: 'ww-invoices',
  imports: [
    DatePipe,
    EmptyStateComponent,
    MatButtonModule,
    MatSelectModule,
    MatTableModule,
    MoneyPipe,
    PageHeaderComponent,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './invoices.component.html',
  styleUrl: './invoices.component.scss',
})
export class InvoicesComponent implements OnInit {
  private readonly invoicesApi = inject(InvoicesApiService);
  private readonly route = inject(ActivatedRoute);

  protected readonly columns = ['invoice', 'tenant', 'due', 'total', 'status'];
  protected readonly statuses: InvoiceListStatus[] = ['draft', 'issued', 'overdue', 'paid', 'void'];
  protected readonly labels = StatusChipComponent.LABELS;
  protected readonly months = InvoiceMonths.past();
  protected readonly invoices = signal<InvoiceSummary[]>([]);
  protected readonly nextCursor = signal<string | null>(null);
  protected readonly error = signal('');
  protected readonly isLoaded = signal(false);
  protected readonly filter = signal<InvoiceFilter>({});

  ngOnInit(): void {
    const params = this.route.snapshot.queryParamMap;
    this.filter.set({
      status: (params.get('status') ?? '') as InvoiceListStatus | '',
      month: params.get('month') ?? '',
      tenant_id: params.get('tenant_id') ?? '',
    });
    void this.load();
  }

  protected change(change: InvoiceFilter): void {
    this.filter.update((filter) => ({ ...filter, ...change }));
    void this.load();
  }

  protected async load(cursor: string | null = null): Promise<void> {
    try {
      const page = await firstValueFrom(this.invoicesApi.list({ ...this.filter(), cursor }));
      this.invoices.update((invoices) => (cursor ? [...invoices, ...page.items] : page.items));
      this.nextCursor.set(page.next_cursor);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoaded.set(true);
    }
  }

  /** "overdue" in the list for an issued invoice past its due date. */
  protected statusOf(invoice: InvoiceSummary): string {
    return invoice.is_overdue ? 'overdue' : invoice.status;
  }
}
