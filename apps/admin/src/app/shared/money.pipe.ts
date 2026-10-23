import { Pipe, PipeTransform } from '@angular/core';
import { Money } from './money';

/** `{{ plan.platform_fee | money: plan.currency }}` shows "$299.00". */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency: string | null | undefined): string {
    return Money.format(amount, currency);
  }
}
