import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { PaymentAccount } from '../../core/api/models/payment';
import { PaymentsApiService } from '../../core/api/payments-api.service';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { MoneyPipe } from '../../shared/money.pipe';
import { StatusChipComponent } from '../../shared/status-chip.component';
import { ConnectStripeDialogComponent } from './connect-stripe-dialog.component';
import { HoldAmountDialogComponent } from './hold-amount-dialog.component';
import { PaymentAccountAction } from './payment-account-action';

/**
 * The company's Stripe account: how far setup has come, what Stripe still needs, the card
 * hold, and the one button for the next step. Stripe's onboarding sends people back here
 * with ?stripe=return (done) or ?stripe=refresh (the link expired).
 */
@Component({
  selector: 'ww-payment-account-card',
  imports: [MatButtonModule, MatIconModule, MoneyPipe, StatusChipComponent],
  templateUrl: './payment-account-card.component.html',
  styleUrl: './payment-account-card.component.scss',
})
export class PaymentAccountCardComponent implements OnInit {
  protected readonly permissions = inject(PermissionsService);
  private readonly paymentsApi = inject(PaymentsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly account = signal<PaymentAccount | null>(null);
  protected readonly error = signal('');
  protected readonly isBusy = signal(false);
  protected readonly action = computed(() => {
    const account = this.account();
    return account ? PaymentAccountAction.of(account) : null;
  });

  ngOnInit(): void {
    void this.start();
  }

  protected async act(): Promise<void> {
    switch (this.action()?.kind) {
      case 'connect':
        return this.connect();
      case 'onboard':
        return this.openLink(this.paymentsApi.onboardingLink(), 'self');
      case 'dashboard':
        return this.openLink(this.paymentsApi.dashboardLink(), 'blank');
      default:
        return;
    }
  }

  protected async refresh(): Promise<void> {
    await this.run(async () => {
      this.account.set(await firstValueFrom(this.paymentsApi.refreshAccount()));
    });
  }

  protected async editHold(): Promise<void> {
    const dialog = this.dialog.open(HoldAmountDialogComponent, { data: this.account() });
    const saved = await firstValueFrom(dialog.afterClosed());
    if (saved) {
      this.account.set(saved);
      this.snackBar.open('Card hold saved.', 'OK', { duration: 6000 });
    }
  }

  private async connect(): Promise<void> {
    const dialog = this.dialog.open(ConnectStripeDialogComponent);
    const connected = await firstValueFrom(dialog.afterClosed());
    if (connected) {
      this.account.set(connected);
      await this.openLink(this.paymentsApi.onboardingLink(), 'self');
    }
  }

  /** A one-time Stripe link: onboarding replaces this page, the dashboard opens beside it. */
  private async openLink(
    request: ReturnType<PaymentsApiService['onboardingLink']>,
    target: 'self' | 'blank',
  ) {
    await this.run(async () => {
      const { url } = await firstValueFrom(request);
      if (target === 'self') {
        window.location.assign(url);
      } else {
        window.open(url, '_blank', 'noopener');
      }
    });
  }

  private async start(): Promise<void> {
    await this.run(async () => {
      this.account.set(await firstValueFrom(this.paymentsApi.account()));
    });
    const outcome = PaymentAccountAction.afterOnboarding(
      this.route.snapshot.queryParamMap.get('stripe'),
    );
    if (outcome === 'returned') {
      await this.refresh();
      this.snackBar.open('Welcome back from Stripe. The account status is up to date.', 'OK', {
        duration: 8000,
      });
    } else if (outcome === 'expired') {
      this.snackBar.open('The Stripe link expired. Continue the setup to get a new one.', 'OK', {
        duration: 8000,
      });
    }
    if (outcome) {
      await this.router.navigate([], { queryParams: {}, replaceUrl: true });
    }
  }

  private async run(work: () => Promise<void>): Promise<void> {
    this.isBusy.set(true);
    try {
      await work();
      this.error.set('');
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isBusy.set(false);
    }
  }
}
