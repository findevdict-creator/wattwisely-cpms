import { Injectable } from '@angular/core';
import { CardForm, CardFormOptions } from './card-form';
import { CardSaverOptions, StripeCardSaver } from './stripe-card-saver';
import { StripeCardForm } from './stripe-card-form';

/** Makes the card form for a hold, or for saving a card. Tests replace this to keep the provider out. */
@Injectable({ providedIn: 'root' })
export class CardFormFactory {
  create(options: CardFormOptions): CardForm {
    return new StripeCardForm(options);
  }

  /** The form that saves a card to the driver's login (module 19). */
  createSaver(options: CardSaverOptions): CardForm {
    return new StripeCardSaver(options);
  }
}
