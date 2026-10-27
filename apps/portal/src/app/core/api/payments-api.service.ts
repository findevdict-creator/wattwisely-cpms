import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  PaymentAccount,
  PaymentDetail,
  PaymentFilter,
  PaymentPage,
  Refund,
} from './models/payment';

/** Calls /v1/payment-account, /v1/payments and /v1/refunds (module 6). */
@Injectable({ providedIn: 'root' })
export class PaymentsApiService {
  static readonly PAGE_SIZE = 50;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  account(): Observable<PaymentAccount> {
    return this.http.get<PaymentAccount>(this.url('payment-account'));
  }

  connect(country: string): Observable<PaymentAccount> {
    return this.http.post<PaymentAccount>(this.url('payment-account'), { country });
  }

  /** A one-time link into Stripe's onboarding; open it right away. */
  onboardingLink(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(this.url('payment-account/onboarding-link'), {});
  }

  dashboardLink(): Observable<{ url: string }> {
    return this.http.post<{ url: string }>(this.url('payment-account/dashboard-link'), {});
  }

  refreshAccount(): Observable<PaymentAccount> {
    return this.http.post<PaymentAccount>(this.url('payment-account/refresh'), {});
  }

  /** Both holds in minor units: the guest hold, and the member hold for the company's own drivers. */
  updateHold(
    account: PaymentAccount,
    holds: { hold_amount: number; member_hold_amount: number },
  ): Observable<PaymentAccount> {
    return this.http.patch<PaymentAccount>(this.url('payment-account'), holds, {
      headers: { 'If-Match': String(account.version) },
    });
  }

  list(filter: PaymentFilter, cursor: string | null = null): Observable<PaymentPage> {
    let params = new HttpParams().set('limit', PaymentsApiService.PAGE_SIZE);
    for (const [key, value] of Object.entries(filter)) {
      params = value ? params.set(key, value) : params;
    }
    params = cursor ? params.set('cursor', cursor) : params;
    return this.http.get<PaymentPage>(this.url('payments'), { params });
  }

  get(id: string): Observable<PaymentDetail> {
    return this.http.get<PaymentDetail>(this.url(`payments/${id}`));
  }

  requestRefund(paymentId: string, input: { amount: number; reason: string }): Observable<Refund> {
    return this.http.post<Refund>(this.url(`payments/${paymentId}/refunds`), input);
  }

  /** The approval queue, or recent refunds in the given states. */
  refunds(status = 'awaiting_approval'): Observable<Refund[]> {
    const params = new HttpParams().set('status', status);
    return this.http.get<Refund[]>(this.url('refunds'), { params });
  }

  approveRefund(id: string): Observable<Refund> {
    return this.http.post<Refund>(this.url(`refunds/${id}/approve`), {});
  }

  cancelRefund(id: string): Observable<Refund> {
    return this.http.post<Refund>(this.url(`refunds/${id}/cancel`), {});
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
