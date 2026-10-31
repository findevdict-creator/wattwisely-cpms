import { Component, ElementRef, computed, inject, input, signal, viewChild } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IonButton, IonCheckbox, IonContent, IonSpinner, NavController } from '@ionic/angular';
import { SavedCardsStore } from '@wattwisely/driver-core';
import { PageBarComponent } from '../../shared/page-bar.component';
import { CardAdder } from './card-adder';

/**
 * "Add a card" (Figma 11): Stripe's own form, so the card's number never reaches Wattwisely,
 * and whether it becomes the default. Opened from Payment methods, or from a plug or the
 * card page, which `next` names and the page goes back to.
 */
@Component({
  selector: 'ww-add-card',
  imports: [IonButton, IonCheckbox, IonContent, IonSpinner, MatIconModule, PageBarComponent],
  providers: [SavedCardsStore, CardAdder],
  templateUrl: './add-card.component.html',
  styleUrl: './cards.scss',
})
export class AddCardComponent {
  /** The page to go back to; Payment methods when the query names none. */
  readonly next = input<string>();

  protected readonly adder = inject(CardAdder);
  private readonly navController = inject(NavController);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  protected readonly isDefault = signal(true);
  protected readonly backTo = computed(() => AddCardComponent.back(this.next()));

  ionViewDidEnter(): void {
    void this.adder.open(this.host().nativeElement);
  }

  ionViewWillLeave(): void {
    this.adder.close();
  }

  protected async save(): Promise<void> {
    if (await this.adder.save(this.isDefault())) {
      await this.navController.navigateBack(this.backTo());
    }
  }

  /** Only a page of this app: a link cannot send the driver elsewhere. */
  static back(next: string | undefined): string {
    return next?.startsWith('/') && !next.startsWith('//') ? next : '/account/cards';
  }
}
