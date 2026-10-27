import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { EmptyStateComponent, PageHeaderComponent } from '@wattwisely/ui';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { InvoicesApiService } from '../../core/api/invoices-api.service';
import { InvoiceSummary } from '../../core/api/models/invoice';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';

/** Settings, Invoices (module 15): what Wattwisely has invoiced the company, newest month first. */
@Component({
  selector: 'ww-invoices',
  imports: [
    DatePipe,
    EmptyStateComponent,
    MatTableModule,
    MoneyPipe,
    PageHeaderComponent,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './invoices.component.html',
})
export class InvoicesComponent implements OnInit {
  private readonly invoicesApi = inject(InvoicesApiService);

  protected readonly columns = ['number', 'month', 'net', 'tax', 'total', 'due', 'status'];
  protected readonly invoices = signal<InvoiceSummary[]>([]);
  protected readonly isLoaded = signal(false);
  protected readonly error = signal('');

  async ngOnInit(): Promise<void> {
    try {
      this.invoices.set(await firstValueFrom(this.invoicesApi.list()));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoaded.set(true);
    }
  }

  /** "overdue" for an unpaid invoice past its due date. */
  protected statusOf(invoice: InvoiceSummary): string {
    return invoice.is_overdue ? 'overdue' : invoice.status;
  }
}
