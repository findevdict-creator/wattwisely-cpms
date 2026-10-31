import { TitleCasePipe } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { CardSaverComponent } from './card-saver.component';
import { SavedCardsStore } from '@wattwisely/driver-core';

/**
 * "Your cards" on the account page (module 19): the cards saved to the login, which one the
 * holds come from, and adding or removing one. One card serves every operator.
 */
@Component({
  selector: 'ww-saved-cards',
  imports: [CardSaverComponent, MatButtonModule, MatIconModule, TitleCasePipe],
  providers: [SavedCardsStore],
  templateUrl: './saved-cards.component.html',
  styleUrl: './saved-cards.component.scss',
})
export class SavedCardsComponent implements OnInit {
  protected readonly store = inject(SavedCardsStore);

  ngOnInit(): void {
    void this.store.load();
  }

  protected expiry(month: number, year: number): string {
    return `${String(month).padStart(2, '0')}/${String(year).slice(-2)}`;
  }
}
