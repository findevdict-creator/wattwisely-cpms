import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

/** The root of the driver app: a thin bar with the way home, and the page below it. */
@Component({
  selector: 'ww-root',
  imports: [MatIconModule, RouterLink, RouterOutlet],
  template: `
    <header class="bar">
      <a routerLink="/" class="brand" aria-label="Home">
        <mat-icon>bolt</mat-icon>
        <span>Wattwisely</span>
      </a>
    </header>
    <main>
      <router-outlet />
    </main>
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
    main {
      max-width: 480px;
      margin: 0 auto;
      padding: 16px;
    }
  `,
})
export class AppComponent {}
