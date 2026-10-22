import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Charge } from '../../core/api/models/charge';
import { CardForm } from '../../core/payment/card-form';
import { CardFormFactory } from '../../core/payment/card-form.factory';
import { MoneyPipe } from '../../shared/money.pipe';

/**
 * The provider's card form for the hold. Once the provider confirms the card, the page
 * is told, and it asks the API to check the hold and start the charger.
 */
@Component({
  selector: 'ww-card-form',
  imports: [MatButtonModule, MatProgressSpinnerModule, MoneyPipe],
  template: `
    <p>
      A hold of <strong>{{ charge().hold_amount | money: charge().currency }}</strong> is placed on
      your card now. At the end you pay only what you used; the rest is released.
    </p>
    <div #host class="host" data-testid="card-form"></div>
    @if (error()) {
      <p class="error" role="alert" data-testid="card-error">{{ error() }}</p>
    }
    <button
      mat-flat-button
      class="pay"
      (click)="pay()"
      [disabled]="!isReady() || isPaying()"
      data-testid="pay"
    >
      @if (isPaying()) {
        <mat-spinner diameter="20" />
      }
      Pay and start charging
    </button>
  `,
  styles: `
    .host {
      min-height: 120px;
      margin: 12px 0;
    }
    .pay {
      width: 100%;
      height: 52px;
      font-size: 16px;
    }
  `,
})
export class CardFormComponent implements AfterViewInit, OnDestroy {
  readonly charge = input.required<Charge>();
  readonly confirmed = output<void>();

  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');
  private readonly factory = inject(CardFormFactory);
  private form: CardForm | null = null;

  protected readonly isReady = signal(false);
  protected readonly isPaying = signal(false);
  protected readonly error = signal('');

  async ngAfterViewInit(): Promise<void> {
    const charge = this.charge();
    if (!charge.client_secret || !charge.publishable_key) {
      this.error.set('The card form is not available for this charge any more.');
      return;
    }
    this.form = this.factory.create({
      publishableKey: charge.publishable_key,
      accountId: charge.provider_account_id,
      clientSecret: charge.client_secret,
      returnUrl: CardFormComponent.returnUrl(),
    });
    try {
      await this.form.mount(this.host().nativeElement);
      this.isReady.set(true);
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }

  protected async pay(): Promise<void> {
    if (!this.form) {
      return;
    }
    this.isPaying.set(true);
    this.error.set('');
    const result = await this.form.confirm();
    this.isPaying.set(false);
    if (result.isConfirmed) {
      this.confirmed.emit();
    } else {
      this.error.set(result.message ?? 'The card was refused.');
    }
  }

  ngOnDestroy(): void {
    this.form?.destroy();
  }

  /** This page again, marked so that it checks the hold when a redirect brings the driver back. */
  private static returnUrl(): string {
    const url = new URL(window.location.href);
    url.search = '';
    url.searchParams.set('returned', '1');
    return url.toString();
  }
}
