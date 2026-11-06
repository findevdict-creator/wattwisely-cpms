import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { Initials, PaymentModeWords } from '@wattwisely/driver-core';
import { BrandService } from '../../core/branding/brand.service';
import { AccountStore } from './account.store';

/**
 * "Your operators" (module 38, from the account page of module 19): each operator linked to
 * the login, what it calls the driver and who pays there, opening what it holds about them.
 */
@Component({
  selector: 'ww-operators',
  imports: [MatIconModule, MatProgressSpinnerModule, RouterLink],
  providers: [AccountStore],
  template: `
    <a class="back" routerLink="/account">
      <mat-icon svgIcon="arrow-left" />
      Your account
    </a>
    <header class="where"><h1>Your operators</h1></header>
    @for (operator of store.operators(); track operator.tenant_id) {
      <a class="panel row" [routerLink]="['/account/operators', operator.tenant_id]">
        <span class="op-mark" [class.off]="operator.status === 'blocked'">
          {{ initialsOf(operator.operator_name) }}
        </span>
        <span class="ww-two ww-grow">
          <b>{{ operator.operator_name }}</b>
          <span>
            Knows you as {{ operator.driver_name }}
            @if (operator.reference) {
              · {{ operator.reference }}
            }
          </span>
          <span>{{ paymentWords(operator.payment_mode) }}</span>
        </span>
        @if (operator.status === 'blocked') {
          <span class="ww-chip danger" data-testid="blocked">Blocked</span>
        } @else {
          <mat-icon class="chevron" svgIcon="chevron-right" />
        }
      </a>
    } @empty {
      @if (store.me()) {
        <section class="panel">
          <p class="hint" data-testid="no-operators">
            No operator is linked to your account yet. An operator that keeps you as one of its
            drivers can invite you by e-mail; the link in that e-mail brings you here.
          </p>
        </section>
      } @else if (!store.error()) {
        <div class="loading"><mat-spinner diameter="32" /></div>
      }
    }
    @if (store.error()) {
      <p class="notice danger" role="alert">{{ store.error() }}</p>
    }
  `,
  styles: `
    .chevron {
      flex: none;
      width: 18px;
      height: 18px;
      color: var(--mat-sys-outline);
    }
    .notice {
      margin: 0;
    }
  `,
})
export class OperatorsComponent implements OnInit {
  protected readonly store = inject(AccountStore);

  constructor() {
    inject(BrandService).reset();
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected initialsOf(name: string): string {
    return Initials.of(name);
  }

  protected paymentWords(mode: string): string {
    return PaymentModeWords.short(mode);
  }
}
