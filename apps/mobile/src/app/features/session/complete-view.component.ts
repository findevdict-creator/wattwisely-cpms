import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular';
import { DriverChargeDetail, DurationPipe, Money } from '@wattwisely/driver-core';
import { PlugWords } from '../../core/charging/plug-words';
import { ReceiptRows } from '../../core/charging/receipt-rows';

/** One line of the hold's end: what was held, taken and given back. */
interface HoldRow {
  label: string;
  value: string;
}

/**
 * "Charging complete" (Figma 10): the energy and time, the receipt line by line with its tax
 * and total, then what became of the hold. The receipt's PDF joins it with the sessions module.
 */
@Component({
  selector: 'ww-complete-view',
  imports: [DurationPipe, IonButton, RouterLink],
  templateUrl: './complete-view.component.html',
  styleUrl: './session-views.scss',
})
export class CompleteViewComponent {
  readonly charge = input.required<DriverChargeDetail>();

  protected readonly energy = computed(() => `${(this.charge().energy_wh / 1000).toFixed(1)} kWh`);
  protected readonly currency = computed(() => this.charge().currency ?? 'EUR');
  protected readonly rows = computed(() =>
    ReceiptRows.of(this.charge().receipt?.lines ?? [], this.currency()),
  );
  protected readonly tax = computed(() => this.money(this.charge().receipt?.tax ?? null));
  protected readonly total = computed(() =>
    this.money(this.charge().receipt?.gross ?? this.charge().amount),
  );
  protected readonly hold = computed(() => this.holdRows());

  private holdRows(): HoldRow[] {
    const charge = this.charge();
    const payment = charge.payment;
    if (!payment || !payment.hold_amount) {
      return [];
    }
    const card =
      payment.card_brand && payment.card_last4
        ? ` on ${PlugWords.card(payment.card_brand, payment.card_last4)}`
        : '';
    const taken = payment.status === 'captured' ? (charge.amount ?? 0) : 0;
    const rows = [{ label: `Held${card}`, value: this.money(payment.hold_amount) }];
    if (payment.status === 'authorised') {
      return [...rows, { label: 'Charged', value: 'Being worked out…' }];
    }
    return [
      ...rows,
      { label: 'Charged', value: this.money(taken) },
      { label: 'Released', value: this.money(Math.max(0, payment.hold_amount - taken)) },
    ];
  }

  private money(amount: number | null): string {
    return Money.format(amount, this.currency());
  }
}
