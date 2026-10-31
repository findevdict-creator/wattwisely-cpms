import { Component, computed, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular';
import { DurationPipe, Money } from '@wattwisely/driver-core';
import { PlugWords } from '../../core/charging/plug-words';
import { ReceiptRows } from '../../core/charging/receipt-rows';
import { SessionWords } from '../../core/history/session-words';
import { SupportContact } from '../../core/history/support-contact';
import { PageBarComponent } from '../../shared/page-bar.component';
import { ReceiptStore } from './receipt.store';

/**
 * "Session detail" (Figma 11): where and when, the energy, time and total, the receipt line
 * by line with how it was paid, the operator's contact, and the receipt as a PDF.
 */
@Component({
  selector: 'ww-receipt',
  imports: [DurationPipe, IonButton, IonContent, IonSpinner, MatIconModule, PageBarComponent],
  providers: [ReceiptStore],
  templateUrl: './receipt.component.html',
  styleUrl: './receipt.component.scss',
})
export class ReceiptComponent {
  /** The route's :id. */
  readonly id = input.required<string>();

  protected readonly store = inject(ReceiptStore);

  protected readonly heading = computed(() => {
    const charge = this.store.charge();
    return charge ? SessionWords.heading(charge) : 'Charge';
  });
  protected readonly place = computed(() => {
    const charge = this.store.charge();
    return charge ? `${charge.site_name} · Connector ${charge.connector_label}` : '';
  });
  protected readonly period = computed(() => {
    const charge = this.store.charge();
    return charge ? SessionWords.period(charge) : '';
  });
  protected readonly currency = computed(() => this.store.charge()?.currency ?? 'EUR');
  protected readonly rows = computed(() =>
    ReceiptRows.of(this.store.charge()?.receipt?.lines ?? [], this.currency()),
  );
  protected readonly total = computed(() => {
    const charge = this.store.charge();
    return charge ? SessionWords.amount(charge) : '';
  });
  protected readonly tax = computed(() =>
    Money.format(this.store.charge()?.receipt?.tax ?? null, this.currency()),
  );
  protected readonly paidWith = computed(() => this.paymentWords());
  protected readonly contact = computed(() => SupportContact.of(this.store.branding()));

  ionViewWillEnter(): void {
    void this.store.load(this.id());
  }

  protected energy(): string {
    const charge = this.store.charge();
    return charge ? SessionWords.energy(charge) : '';
  }

  /** "Paid with Visa •••• 4242", what became of a refused card, or who made it free. */
  private paymentWords(): string {
    const charge = this.store.charge();
    const payment = charge?.payment;
    if (!payment) {
      return charge?.payment_rule?.words ?? '';
    }
    if (payment.status === 'failed') {
      return 'Card refused · nothing taken';
    }
    const card =
      payment.card_brand && payment.card_last4
        ? PlugWords.card(payment.card_brand, payment.card_last4)
        : 'your card';
    return payment.status === 'captured' ? `Paid with ${card}` : `Held on ${card}`;
  }
}
