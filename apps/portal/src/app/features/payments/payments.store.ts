import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Payment, PaymentFilter, Refund } from '../../core/api/models/payment';
import { PaymentsApiService } from '../../core/api/payments-api.service';

/** The payments page's data: the refunds waiting for approval and the payments, newest first. */
@Injectable()
export class PaymentsStore {
  private readonly paymentsApi = inject(PaymentsApiService);

  readonly payments = signal<Payment[]>([]);
  readonly queue = signal<Refund[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly filter = signal<PaymentFilter>({});
  readonly isLoading = signal(false);
  readonly error = signal('');

  async load(filter: PaymentFilter = this.filter()): Promise<void> {
    this.filter.set(filter);
    this.payments.set([]);
    this.nextCursor.set(null);
    await this.loadMore();
  }

  async loadMore(): Promise<void> {
    this.isLoading.set(true);
    try {
      const page = await firstValueFrom(this.paymentsApi.list(this.filter(), this.nextCursor()));
      this.payments.update((payments) => [...payments, ...page.items]);
      this.nextCursor.set(page.next_cursor);
      this.error.set('');
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoading.set(false);
    }
  }

  async loadQueue(): Promise<void> {
    try {
      this.queue.set(await firstValueFrom(this.paymentsApi.refunds('awaiting_approval')));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** Approves or cancels a waiting refund, then reloads the queue and the payments. */
  async decide(refund: Refund, decision: 'approve' | 'cancel'): Promise<void> {
    try {
      const request =
        decision === 'approve'
          ? this.paymentsApi.approveRefund(refund.id)
          : this.paymentsApi.cancelRefund(refund.id);
      await firstValueFrom(request);
      await Promise.all([this.loadQueue(), this.load()]);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
