import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { InvoicesApiService } from '../../core/api/invoices-api.service';
import { Invoice } from '../../core/api/models/invoice';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';

/** One invoice from Wattwisely, laid out to read on screen and to print or save as PDF. */
@Component({
  selector: 'ww-invoice',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MoneyPipe,
    RouterLink,
    StatusChipComponent,
  ],
  templateUrl: './invoice.component.html',
  styleUrl: './invoice.component.scss',
})
export class InvoiceComponent implements OnInit {
  readonly id = input.required<string>();
  private readonly invoicesApi = inject(InvoicesApiService);

  protected readonly columns = ['description', 'quantity', 'unit_price', 'amount'];
  protected readonly invoice = signal<Invoice | null>(null);
  protected readonly error = signal('');
  protected readonly status = computed(() => {
    const invoice = this.invoice();
    return invoice?.is_overdue ? 'overdue' : (invoice?.status ?? '');
  });

  async ngOnInit(): Promise<void> {
    try {
      this.invoice.set(await firstValueFrom(this.invoicesApi.get(this.id())));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  protected print(): void {
    window.print();
  }
}
