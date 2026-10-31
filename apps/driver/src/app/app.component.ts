import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { LogoComponent } from '@wattwisely/ui';
import { DriverAuthService } from './core/auth/driver-auth.service';
import { BrandTheme } from './core/branding/brand-theme';
import { BrandService } from './core/branding/brand.service';
import { Initials } from '@wattwisely/driver-core';

/**
 * The root of the driver app: a bar in the operator's colours with its logo, or its initials
 * and name, the way home and the way to one's account (module 19), the page below it, and the
 * platform's line at the foot (module 8).
 */
@Component({
  selector: 'ww-root',
  imports: [LogoComponent, MatIconModule, RouterLink, RouterOutlet],
  template: `
    <header class="bar">
      <a routerLink="/" class="brand" aria-label="Home" data-testid="brand">
        @if (brandService.brand().logo_url; as logoUrl) {
          <img class="logo" [src]="logoUrl" [alt]="brandService.brand().name" />
        } @else {
          <span class="initials" [class.platform]="isPlatform()">
            @if (isPlatform()) {
              <ww-logo isMarkOnly aria-hidden="true" />
            } @else {
              {{ initials() }}
            }
          </span>
          <span>{{ brandService.brand().name }}</span>
        }
      </a>
      <a
        routerLink="/account"
        class="account"
        aria-label="Your account"
        data-testid="account"
        [class.signed-in]="auth.isLoggedIn()"
      >
        <mat-icon svgIcon="circle-user-round" />
      </a>
    </header>
    <main>
      <router-outlet />
    </main>
    <footer class="powered-by" data-testid="powered-by">
      <ww-logo isMarkOnly aria-hidden="true" />
      Powered by {{ brandService.brand().platform_name }}
    </footer>
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      min-height: 100%;
    }
    .bar {
      display: flex;
      gap: 8px;
      align-items: center;
      height: 52px;
      padding: 0 16px;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }
    .brand {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      min-width: 0;
      color: inherit;
      text-decoration: none;
      font: 600 17px/24px var(--ww-font);
    }
    .initials {
      display: grid;
      flex: none;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 7px;
      font-size: 12px;
      background: var(--ww-ink);
      color: var(--ww-white);
    }
    .initials.platform {
      background: var(--ww-white);
    }
    .initials ww-logo {
      height: 18px;
    }
    .logo {
      height: 32px;
      max-width: 180px;
      object-fit: contain;
    }
    .account {
      display: inline-flex;
      margin-left: auto;
      color: inherit;
      opacity: 0.8;
    }
    .account .mat-icon {
      width: 26px;
      height: 26px;
    }
    .account.signed-in {
      opacity: 1;
    }
    main {
      flex: 1;
      box-sizing: border-box;
      width: 100%;
      max-width: 480px;
      margin: 0 auto;
      padding: 20px 20px 24px;
      font-size: 15px;
      line-height: 22px;
    }
    .powered-by {
      display: flex;
      gap: 4px;
      align-items: center;
      justify-content: center;
      padding: 0 0 20px;
      font-size: 12px;
      line-height: 16px;
      font-weight: 500;
      color: var(--mat-sys-outline);
    }
    .powered-by ww-logo {
      height: 12px;
      color: inherit;
    }
  `,
})
export class AppComponent {
  protected readonly brandService = inject(BrandService);
  protected readonly auth = inject(DriverAuthService);

  /** The platform's own pages show its mark; an operator without a logo shows its initials. */
  protected readonly isPlatform = computed(
    () => this.brandService.brand().name === BrandTheme.PLATFORM.name,
  );
  protected readonly initials = computed(() => Initials.of(this.brandService.brand().name));
}
