import { Pipe, PipeTransform } from '@angular/core';
import { Money } from './money';

/** `{{ session.gross_amount | money: session.currency }}` shows "£8.80". */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  transform(amount: number | null | undefined, currency: string | null | undefined): string {
    return Money.format(amount, currency);
  }
}
