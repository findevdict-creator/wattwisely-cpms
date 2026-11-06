import { TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { CardSaverComponent } from './card-saver.component';
import { CardWords, PaymentMethod, SavedCardsStore } from '@wattwisely/driver-core';

/**
 * "Your cards" (module 19), on "Payment methods" since module 38: the cards saved to the
 * login, which one the holds come from, which have expired, and adding one (as the default
 * when the driver says so) or removing one. One card serves every operator.
 */
@Component({
  selector: 'ww-saved-cards',
  imports: [CardSaverComponent, MatButtonModule, MatCheckboxModule, MatIconModule, TitleCasePipe],
  providers: [SavedCardsStore],
  templateUrl: './saved-cards.component.html',
  styleUrl: './saved-cards.component.scss',
})
export class SavedCardsComponent implements OnInit {
  protected readonly store = inject(SavedCardsStore);
  /** Whether the card being added becomes the default; the first card always does. */
  protected readonly isDefault = signal(true);

  ngOnInit(): void {
    void this.store.load();
  }

  /** "Expires 04/28", or "Expired 09/26". */
  protected expiry(card: PaymentMethod): string {
    return CardWords.expiry(card);
  }

  protected isExpired(card: PaymentMethod): boolean {
    return CardWords.isExpired(card);
  }
}
