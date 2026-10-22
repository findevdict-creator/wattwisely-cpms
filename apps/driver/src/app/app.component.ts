import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { BrandService } from './core/branding/brand.service';

/**
 * The root of the driver app: a bar in the operator's colours with its logo or name and
 * the way home, the page below it, and the platform's line at the foot (module 8).
 */
@Component({
  selector: 'ww-root',
  imports: [MatIconModule, RouterLink, RouterOutlet],
  template: `
    <header class="bar">
      <a routerLink="/" class="brand" aria-label="Home" data-testid="brand">
        @if (brandService.brand().logo_url; as logoUrl) {
          <img class="logo" [src]="logoUrl" [alt]="brandService.brand().name" />
        } @else {
          <mat-icon>bolt</mat-icon>
          <span>{{ brandService.brand().name }}</span>
        }
      </a>
    </header>
    <main>
      <router-outlet />
    </main>
    <footer class="powered-by" data-testid="powered-by">
      <mat-icon>bolt</mat-icon>
      Powered by {{ brandService.brand().platform_name }}
    </footer>
  `,
  styles: `
    .bar {
      display: flex;
      align-items: center;
      height: 52px;
      padding: 0 16px;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }
    .brand {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      color: inherit;
      text-decoration: none;
      font-weight: 500;
      font-size: 18px;
    }
    .logo {
      height: 32px;
      max-width: 180px;
      object-fit: contain;
    }
    main {
      max-width: 480px;
      margin: 0 auto;
      padding: 16px;
    }
    .powered-by {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 16px;
      font-size: 12px;
      color: var(--mat-sys-on-surface-variant);
    }
    .powered-by mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }
  `,
})
export class AppComponent {
  protected readonly brandService = inject(BrandService);
}
