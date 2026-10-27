import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/**
 * The top of every page: an optional way back, the title, a line under it and the page's
 * actions on the right. A chip next to the title goes in with `wwTitleExtra`; a subtitle that
 * needs markup goes in with `wwSubtitle` and the class `ww-page-subtitle`.
 */
@Component({
  selector: 'ww-page-header',
  imports: [MatIconModule, RouterLink],
  template: `
    <div class="titles">
      @if (backLink(); as link) {
        <a class="back" [routerLink]="link"><mat-icon svgIcon="arrow-left" />{{ backLabel() }}</a>
      }
      <h1>{{ heading() }}<ng-content select="[wwTitleExtra]" /></h1>
      @if (subtitle()) {
        <p class="ww-page-subtitle">{{ subtitle() }}</p>
      }
      <ng-content select="[wwSubtitle]" />
    </div>
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin-bottom: 24px;
    }
    .titles {
      display: flex;
      flex: 1 1 320px;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }
    h1 {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      margin: 0;
      font: 600 22px/28px var(--ww-font);
    }
    .back {
      display: inline-flex;
      gap: 4px;
      align-items: center;
      align-self: flex-start;
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
    }
    .back mat-icon {
      width: 14px;
      height: 14px;
    }
  `,
})
export class PageHeaderComponent {
  readonly heading = input.required<string>();
  readonly subtitle = input('');
  /** Where the way back leads, e.g. '/alerts'; none when empty. */
  readonly backLink = input<string | readonly unknown[] | null>(null);
  readonly backLabel = input('Back');
}
