import { Component, input } from '@angular/core';
import { LogoComponent } from '../logo/logo.component';

/**
 * A page outside the app's frame, in the look of the sign-in pages: the logo, one card with a
 * title, and a line under the card (`wwAuthFoot`). Used before a workspace is open. Something
 * beside the logo, such as the admin console's "Staff console" chip, goes in with `wwAuthBrand`.
 */
@Component({
  selector: 'ww-auth-page',
  imports: [LogoComponent],
  template: `
    <div class="brand">
      <ww-logo />
      <ng-content select="[wwAuthBrand]" />
    </div>
    <section class="card" [style.width]="width()" aria-labelledby="ww-auth-title">
      <div class="titles">
        <h1 id="ww-auth-title">{{ heading() }}</h1>
        @if (subtitle()) {
          <p class="ww-page-subtitle">{{ subtitle() }}</p>
        }
      </div>
      <ng-content />
    </section>
    <ng-content select="[wwAuthFoot]" />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 24px;
      align-items: center;
      justify-content: center;
      box-sizing: border-box;
      min-height: 100%;
      padding: 48px 24px;
      background: var(--mat-sys-background);
    }
    .brand {
      display: flex;
      gap: 12px;
      align-items: center;
    }
    .card {
      display: flex;
      flex-direction: column;
      gap: 20px;
      box-sizing: border-box;
      max-width: 100%;
      padding: 32px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--ww-radius-xl);
      background: var(--mat-sys-surface);
    }
    .titles {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    h1 {
      margin: 0;
      font: 600 22px/28px var(--ww-font);
    }
    @media (max-width: 575px) {
      :host {
        justify-content: flex-start;
        align-items: stretch;
        background: var(--mat-sys-surface);
      }
      .card {
        padding: 0;
        border: 0;
      }
    }
  `,
})
export class AuthPageComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input('');
  readonly width = input('400px');
}
