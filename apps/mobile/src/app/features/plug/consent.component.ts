import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonCheckbox, IonContent, IonSpinner } from '@ionic/angular';
import { AccountStore } from '../../core/account/account.store';
import { ChargeStarter } from '../../core/charging/charge-starter';
import { TopBarComponent } from '../../shared/top-bar.component';
import { PlugStore } from './plug.store';

/**
 * The first charge with an operator (Figma 9, "First charge with an operator"): what the
 * operator will get, and the driver's consent to it, which the API needs before it makes the
 * operator's record of them. A paid charge goes on to the card; a free one starts here.
 */
@Component({
  selector: 'ww-consent',
  imports: [IonButton, IonCheckbox, IonContent, IonSpinner, TopBarComponent],
  providers: [PlugStore, ChargeStarter],
  templateUrl: './consent.component.html',
  styleUrl: './plug.component.scss',
})
export class ConsentComponent {
  readonly identity = input.required<string>();
  readonly connector = input.required<string>();

  protected readonly store = inject(PlugStore);
  protected readonly account = inject(AccountStore);
  protected readonly starter = inject(ChargeStarter);
  private readonly router = inject(Router);

  protected readonly isConsentGiven = signal(false);
  protected readonly operator = computed(() => {
    const place = this.store.place();
    return place ? PlugStore.operator(place) : '';
  });

  ionViewWillEnter(): void {
    void this.store.load(this.identity(), this.connector());
    if (!this.account.me()) {
      void this.account.load();
    }
  }

  protected async continue(): Promise<void> {
    const place = this.store.place();
    if (!place || !this.isConsentGiven()) {
      return;
    }
    if (ChargeStarter.next(place, true) === 'card') {
      await this.router.navigate(['/plug', this.identity(), this.connector(), 'card'], {
        queryParams: { consent: 'given' },
      });
      return;
    }
    await this.starter.start(place, true);
  }
}
