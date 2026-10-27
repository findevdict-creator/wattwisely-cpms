import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { Invoice, InvoiceSummary } from './models/invoice';

/** Calls /v1/invoices: the invoices Wattwisely issued to the company (module 15). */
@Injectable({ providedIn: 'root' })
export class InvoicesApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(): Observable<InvoiceSummary[]> {
    return this.http.get<InvoiceSummary[]>(this.url(''));
  }

  get(id: string): Observable<Invoice> {
    return this.http.get<Invoice>(this.url(`/${id}`));
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/invoices${path}`;
  }
}
