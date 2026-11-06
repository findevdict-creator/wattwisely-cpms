import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { BrandService } from '../../../core/branding/brand.service';
import { SavedCardsComponent } from './saved-cards.component';

/** "Payment methods" (module 38): the saved cards on a page of their own, as in the mobile app. */
@Component({
  selector: 'ww-payment-methods',
  imports: [MatIconModule, RouterLink, SavedCardsComponent],
  template: `
    <a class="back" routerLink="/account">
      <mat-icon svgIcon="arrow-left" />
      Your account
    </a>
    <header class="where"><h1>Payment methods</h1></header>
    <ww-saved-cards />
  `,
})
export class PaymentMethodsComponent {
  constructor() {
    inject(BrandService).reset();
  }
}
