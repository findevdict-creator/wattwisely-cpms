import { Pipe, PipeTransform } from '@angular/core';
import { Money } from './money';

/** `{{ band.energy_price_per_kwh | unitPrice: tariff.currency }}` shows "€0.40". */
@Pipe({ name: 'unitPrice' })
export class UnitPricePipe implements PipeTransform {
  transform(decimal: string | null | undefined, currency: string): string {
    return decimal ? Money.unitPrice(decimal, currency) : '';
  }
}
