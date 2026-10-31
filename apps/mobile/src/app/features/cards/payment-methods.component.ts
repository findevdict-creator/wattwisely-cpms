import { Component, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular';
import { PaymentMethod, SavedCardsStore } from '@wattwisely/driver-core';
import { CardWords } from '../../core/account/card-words';
import { Confirmation } from '../../shared/confirmation';
import { PageBarComponent } from '../../shared/page-bar.component';

/**
 * "Payment methods" (Figma 11): the cards saved to the login, which one is the default, the
 * expired ones, and the way to add another. One saved card serves every operator.
 */
@Component({
  selector: 'ww-payment-methods',
  imports: [IonButton, IonContent, IonSpinner, MatIconModule, PageBarComponent, RouterLink],
  providers: [SavedCardsStore],
  templateUrl: './payment-methods.component.html',
  styleUrl: './cards.scss',
})
export class PaymentMethodsComponent {
  protected readonly store = inject(SavedCardsStore);
  private readonly confirmation = inject(Confirmation);

  protected readonly name = CardWords.name;
  protected readonly expiry = (card: PaymentMethod) => CardWords.expiry(card);
  protected readonly isExpired = (card: PaymentMethod) => CardWords.isExpired(card);

  ionViewWillEnter(): void {
    void this.store.load();
  }

  protected async remove(card: PaymentMethod): Promise<void> {
    const isSure = await this.confirmation.ask({
      header: `Remove ${CardWords.name(card)}?`,
      message: 'Charges already paid with it keep their receipts.',
      confirm: 'Remove',
      isDanger: true,
    });
    if (isSure) {
      await this.store.remove(card);
    }
  }
}
