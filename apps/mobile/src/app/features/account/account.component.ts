import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import { Initials, SavedCardsStore } from '@wattwisely/driver-core';
import { AccountStore } from '../../core/account/account.store';
import { CardWords } from '../../core/account/card-words';
import { SignOut } from '../../core/auth/sign-out';
import { NativeApp } from '../../core/native/native-app';

/** One line of the Account menu. */
interface MenuRow {
  link: string;
  icon: string;
  title: string;
  line: string;
  testId: string;
}

/**
 * The Account tab (Figma 11, "Account"): who is signed in, their cards, operators,
 * notifications (module 34), details and data, the way out, and the app's version.
 */
@Component({
  selector: 'ww-account',
  imports: [IonButton, IonContent, MatIconModule, RouterLink],
  providers: [SavedCardsStore],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent {
  /** The menu as the design has it; the cards' and operators' lines are the driver's own. */
  static readonly MENU: MenuRow[] = [
    {
      link: '/account/cards',
      icon: 'credit-card',
      title: 'Payment methods',
      line: '',
      testId: 'menu-cards',
    },
    {
      link: '/account/operators',
      icon: 'building-2',
      title: 'My operators',
      line: '',
      testId: 'menu-operators',
    },
    {
      link: '/account/notifications',
      icon: 'bell',
      title: 'Notifications',
      line: 'Push and e-mail',
      testId: 'menu-notifications',
    },
    {
      link: '/account/details',
      icon: 'user-round',
      title: 'Personal details',
      line: 'Name, phone, e-mail, password',
      testId: 'menu-details',
    },
    {
      link: '/account/privacy',
      icon: 'shield',
      title: 'Privacy and data',
      line: 'Who has your data, delete',
      testId: 'menu-privacy',
    },
  ];

  protected readonly store = inject(AccountStore);
  private readonly cards = inject(SavedCardsStore);
  private readonly signOutFlow = inject(SignOut);
  private readonly nativeApp = inject(NativeApp);

  protected readonly version = signal('');
  protected readonly initials = computed(() => Initials.of(this.store.me()?.display_name ?? ''));
  protected readonly menu = computed<MenuRow[]>(() => {
    const lines: Record<string, string> = {
      '/account/cards': CardWords.summary(this.cards.cards()),
      '/account/operators':
        this.store
          .operators()
          .map((item) => item.operator_name)
          .join(', ') || 'None yet',
    };
    return AccountComponent.MENU.map((row) => ({ ...row, line: lines[row.link] ?? row.line }));
  });

  ionViewWillEnter(): void {
    void this.store.load();
    void this.cards.load();
    void this.nativeApp.version().then((version) => this.version.set(version));
  }

  protected signOut(): void {
    void this.signOutFlow.run();
  }
}
