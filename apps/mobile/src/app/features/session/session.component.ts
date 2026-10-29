import { Component, computed, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonSpinner } from '@ionic/angular';
import { ChargeChips, ChargeWords, DriverChargeDetail } from '@wattwisely/driver-core';
import { NoticeCardComponent } from '../../shared/notice-card.component';
import { TopBarComponent } from '../../shared/top-bar.component';
import { CompleteViewComponent } from './complete-view.component';
import { LiveViewComponent } from './live-view.component';
import { SessionStore } from './session.store';
import { StartingViewComponent } from './starting-view.component';

/**
 * One charge from the start to the receipt (Figma 10): starting, live, complete, or the
 * reason it never started. The page follows the charge by itself while it is open.
 */
@Component({
  selector: 'ww-session',
  imports: [
    CompleteViewComponent,
    IonButton,
    IonContent,
    IonSpinner,
    LiveViewComponent,
    NoticeCardComponent,
    StartingViewComponent,
    TopBarComponent,
  ],
  providers: [SessionStore],
  templateUrl: './session.component.html',
  styleUrl: './session.component.scss',
})
export class SessionComponent {
  static readonly TITLE: Record<string, string> = {
    starting: 'Starting your charge',
    complete: 'Charging complete',
    failed: 'The charge did not start',
  };

  readonly id = input.required<string>();

  protected readonly store = inject(SessionStore);
  private readonly router = inject(Router);

  protected readonly view = computed(() => {
    const charge = this.store.charge();
    return charge ? SessionStore.view(charge) : null;
  });
  protected readonly chip = computed(() => ChargeChips.session(this.store.charge()?.status ?? ''));
  protected readonly title = computed(() => {
    const view = this.view();
    return view === 'live' ? 'Charging' : SessionComponent.TITLE[view ?? 'starting'];
  });
  protected readonly isCardRefused = computed(() => {
    const charge = this.store.charge();
    return charge?.payment?.status === 'failed' || charge?.failure_reason === 'declined';
  });
  protected readonly failure = computed(() => this.failureText(this.store.charge()));

  ionViewWillEnter(): void {
    void this.store.follow(this.id());
  }

  ionViewWillLeave(): void {
    this.store.unfollow();
  }

  /** Back to the plug's card page, to pick another card and start again. */
  protected async chooseCard(charge: DriverChargeDetail): Promise<void> {
    const plug = ['/plug', charge.charger_identity, String(charge.ocpp_connector_id), 'card'];
    await this.router.navigate(plug);
  }

  private failureText(charge: DriverChargeDetail | null): string {
    if (!charge) {
      return '';
    }
    if (this.isCardRefused()) {
      return 'Nothing was charged. Try another card or add a new one.';
    }
    return ChargeWords.failure(charge.failure_reason, charge.payment?.failure_message ?? null);
  }
}
