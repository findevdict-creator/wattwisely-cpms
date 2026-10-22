import { Injectable } from '@angular/core';
import { CardForm, CardFormOptions } from './card-form';
import { StripeCardForm } from './stripe-card-form';

/** Makes the card form for a hold. Tests replace this to keep the provider out. */
@Injectable({ providedIn: 'root' })
export class CardFormFactory {
  create(options: CardFormOptions): CardForm {
    return new StripeCardForm(options);
  }
}
