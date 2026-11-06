import { Component, OnInit, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { CardWords, Initials, SavedCardsStore } from '@wattwisely/driver-core';
import { DriverAuthService } from '../../core/auth/driver-auth.service';
import { BrandService } from '../../core/branding/brand.service';
import { AccountStore } from './account.store';

/** One line of the account menu. */
interface MenuRow {
  link: string;
  icon: string;
  title: string;
  line: string;
  testId: string;
}

/**
 * The driver's account (module 19), as a menu since module 38, like the mobile app's Account
 * tab: who is logged in, then their charges, cards, operators, notifications, details and
 * data, each on a page of its own, and the way out. The page is the platform's.
 */
@Component({
  selector: 'ww-account',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule, RouterLink],
  providers: [AccountStore, SavedCardsStore],
  templateUrl: './account.component.html',
  styleUrl: './account.component.scss',
})
export class AccountComponent implements OnInit {
  static readonly MENU: MenuRow[] = [
    {
      link: '/account/charges',
      icon: 'history',
      title: 'Your charges',
      line: 'Every charge with this login, with receipts',
      testId: 'my-charges',
    },
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
      title: 'Your operators',
      line: '',
      testId: 'menu-operators',
    },
    {
      link: '/account/notifications',
      icon: 'bell',
      title: 'Notifications',
      line: 'E-mail and push',
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
      line: 'Who has your data, download, delete',
      testId: 'menu-privacy',
    },
  ];

  protected readonly store = inject(AccountStore);
  protected readonly auth = inject(DriverAuthService);
  private readonly cards = inject(SavedCardsStore);

  protected readonly initials = computed(() => {
    const me = this.store.me();
    return me ? Initials.of(me.display_name || me.email) : '';
  });
  /** The cards' and the operators' lines are the driver's own. */
  protected readonly menu = computed<MenuRow[]>(() => {
    const operators = this.store.operators().map((item) => item.operator_name);
    const lines: Record<string, string> = {
      '/account/cards': CardWords.summary(this.cards.cards()),
      '/account/operators': operators.join(', ') || 'None yet',
    };
    return AccountComponent.MENU.map((row) => ({ ...row, line: lines[row.link] ?? row.line }));
  });

  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    void this.store.load();
    void this.cards.load();
  }
}
