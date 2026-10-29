import { ChargeMonth, Money } from '@wattwisely/driver-core';

/** A month's card at the top of "My sessions" (Figma 11): "46.30" and "98 kWh · 4 charges". */
export interface MonthTotal {
  label: string;
  amount: string;
  line: string;
}

/** Adds up a month of charges; amounts in more than one currency are listed side by side. */
export class MonthTotals {
  static of(month: ChargeMonth): MonthTotal {
    const sums = new Map<string, number>();
    let energyWh = 0;
    for (const charge of month.charges) {
      energyWh += charge.energy_wh;
      if (charge.amount !== null && charge.currency) {
        sums.set(charge.currency, (sums.get(charge.currency) ?? 0) + charge.amount);
      }
    }
    const amounts = [...sums].map(([currency, amount]) => Money.format(amount, currency));
    const count = month.charges.length;
    return {
      label: month.label,
      amount: amounts.length ? amounts.join(' + ') : 'Free',
      line: `${Math.round(energyWh / 1000)} kWh · ${count} ${count === 1 ? 'charge' : 'charges'}`,
    };
  }
}
