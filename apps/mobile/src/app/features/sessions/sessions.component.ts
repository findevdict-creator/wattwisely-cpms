import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import {
  IonContent,
  IonRefresher,
  IonRefresherContent,
  RefresherCustomEvent,
} from '@ionic/angular';
import { ChargeHistory } from '@wattwisely/driver-core';
import { EmptyStateComponent } from '@wattwisely/ui';
import { HistoryStore } from '../../core/history/history.store';
import { SessionRows } from '../../core/history/session-rows';

/**
 * The Sessions tab (Figma 11, "My sessions"): every charge with this login at every operator,
 * by month, with the latest months' totals, a filter by operator and the list as a CSV file.
 * A finished charge opens its receipt; one still under way opens the live page.
 */
@Component({
  selector: 'ww-sessions',
  imports: [
    EmptyStateComponent,
    IonContent,
    IonRefresher,
    IonRefresherContent,
    MatIconModule,
    RouterLink,
  ],
  templateUrl: './sessions.component.html',
  styleUrl: './sessions.component.scss',
})
export class SessionsComponent {
  protected readonly store = inject(HistoryStore);

  /** The operator the list is narrowed to; empty for all of them. */
  protected readonly operator = signal('');
  protected readonly operators = computed(() => ChargeHistory.operators(this.store.charges()));
  private readonly chargeMonths = computed(() =>
    ChargeHistory.months(this.store.charges(), this.operator()),
  );
  protected readonly months = computed(() => SessionRows.months(this.chargeMonths()));
  protected readonly totals = computed(() => SessionRows.totals(this.chargeMonths()));

  ionViewWillEnter(): void {
    void this.store.load();
  }

  protected async refresh(event: RefresherCustomEvent): Promise<void> {
    await this.store.load();
    await event.target.complete();
  }
}
