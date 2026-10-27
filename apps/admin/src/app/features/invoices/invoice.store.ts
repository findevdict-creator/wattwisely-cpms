import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { InvoicesApiService } from '../../core/api/invoices-api.service';
import { AdjustmentRequest, Invoice, PayInvoiceRequest } from '../../core/api/models/invoice';

/**
 * One invoice's page: the invoice and every step staff take with it. Each step reloads the
 * invoice, and every outcome, good or bad, is told in a short message.
 */
@Injectable()
export class InvoiceStore {
  private readonly invoicesApi = inject(InvoicesApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly invoice = signal<Invoice | null>(null);
  readonly error = signal('');
  private id = '';

  async load(id = this.id): Promise<void> {
    this.id = id;
    try {
      this.invoice.set(await firstValueFrom(this.invoicesApi.get(id)));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** The invoice, which every step needs for its version. */
  current(): Invoice {
    const invoice = this.invoice();
    if (!invoice) {
      throw new Error('The invoice is not loaded yet');
    }
    return invoice;
  }

  addLine(line: AdjustmentRequest): Promise<void> {
    return this.change(this.invoicesApi.addLine(this.current(), line), 'Line added.');
  }

  removeLine(lineId: string): Promise<void> {
    return this.change(this.invoicesApi.removeLine(this.current(), lineId), 'Line removed.');
  }

  regenerate(): Promise<void> {
    const request = this.invoicesApi.regenerate(this.current());
    return this.change(request, 'Fee lines worked out again from today’s plan and prices.');
  }

  async issue(): Promise<void> {
    try {
      const result = await firstValueFrom(this.invoicesApi.issue(this.current()));
      const mail = result.is_email_sent
        ? `E-mailed to ${result.invoice.billing_email}.`
        : 'No e-mail went out: the tenant has no billing e-mail address.';
      this.tell(`Invoice ${result.invoice.number} issued. ${mail}`);
      await this.load();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }

  pay(body: PayInvoiceRequest): Promise<void> {
    return this.change(this.invoicesApi.pay(this.current(), body), 'Invoice marked paid.');
  }

  void(reason: string): Promise<void> {
    return this.change(this.invoicesApi.void(this.current(), reason), 'Invoice voided.');
  }

  tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }

  private async change(request: Observable<unknown>, success: string): Promise<void> {
    try {
      await firstValueFrom(request, { defaultValue: undefined });
      this.tell(success);
      await this.load();
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    }
  }
}
