import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  AdjustmentRequest,
  Invoice,
  InvoiceListStatus,
  InvoicePage,
  IssueInvoiceResult,
  PayInvoiceRequest,
} from './models/invoice';

/** The invoices a filter asks for. */
export interface InvoiceFilter {
  status?: InvoiceListStatus | '';
  tenant_id?: string;
  month?: string;
  cursor?: string | null;
}

/** Calls /v1/admin/invoices and /v1/admin/tenants/{id}/invoices (module 15). */
@Injectable({ providedIn: 'root' })
export class InvoicesApiService {
  static readonly PAGE_SIZE = 50;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(filter: InvoiceFilter): Observable<InvoicePage> {
    let params = new HttpParams().set('limit', InvoicesApiService.PAGE_SIZE);
    for (const [key, value] of Object.entries(filter)) {
      if (value) {
        params = params.set(key, value);
      }
    }
    return this.http.get<InvoicePage>(this.url(''), { params });
  }

  get(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(this.url(`/${id}`));
  }

  /** A draft for a past month ("2026-09"), worked out from today's plan, size and prices. */
  create(tenantId: string, month: string): Observable<Invoice> {
    const url = `${this.runtimeConfig.apiUrl}/v1/admin/tenants/${tenantId}/invoices`;
    return this.http.post<Invoice>(url, { month });
  }

  addLine(invoice: Invoice, line: AdjustmentRequest): Observable<Invoice> {
    return this.http.post<Invoice>(this.url(`/${invoice.id}/lines`), line, this.ifMatch(invoice));
  }

  removeLine(invoice: Invoice, lineId: string): Observable<Invoice> {
    const url = this.url(`/${invoice.id}/lines/${lineId}`);
    return this.http.delete<Invoice>(url, this.ifMatch(invoice));
  }

  regenerate(invoice: Invoice): Observable<Invoice> {
    return this.http.post<Invoice>(
      this.url(`/${invoice.id}/regenerate`),
      {},
      this.ifMatch(invoice),
    );
  }

  issue(invoice: Invoice): Observable<IssueInvoiceResult> {
    return this.http.post<IssueInvoiceResult>(
      this.url(`/${invoice.id}/issue`),
      {},
      this.ifMatch(invoice),
    );
  }

  pay(invoice: Invoice, body: PayInvoiceRequest): Observable<Invoice> {
    return this.http.post<Invoice>(this.url(`/${invoice.id}/pay`), body, this.ifMatch(invoice));
  }

  void(invoice: Invoice, reason: string): Observable<Invoice> {
    return this.http.post<Invoice>(
      this.url(`/${invoice.id}/void`),
      { reason },
      this.ifMatch(invoice),
    );
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/admin/invoices${path}`;
  }

  private ifMatch(invoice: Invoice) {
    return { headers: { 'If-Match': String(invoice.version) } };
  }
}
