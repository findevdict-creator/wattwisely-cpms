import { Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavController } from '@ionic/angular';

/**
 * The bar at the top of the pages under a tab (Figma 11): Back, the page's name, and room on
 * the right for the page's own action, such as a download.
 */
@Component({
  selector: 'ww-page-bar',
  imports: [MatIconModule],
  template: `
    <button type="button" class="back" aria-label="Back" (click)="back()" data-testid="back">
      <mat-icon svgIcon="arrow-left" />
    </button>
    <h1 data-testid="page-title">{{ title() }}</h1>
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      gap: 8px;
      align-items: center;
      min-height: 40px;
    }
    .back {
      display: grid;
      flex: none;
      place-items: center;
      width: 40px;
      height: 40px;
      margin-left: -8px;
      border: 0;
      border-radius: 999px;
      background: none;
      color: var(--ww-ink);
    }
    h1 {
      flex: 1;
      min-width: 0;
      margin: 0;
      font: 600 18px/24px var(--ww-font);
    }
  `,
})
export class PageBarComponent {
  readonly title = input.required<string>();
  /** Where Back goes when the page was opened with nothing behind it. */
  readonly backTo = input('/tabs/account');

  private readonly navController = inject(NavController);

  protected back(): void {
    void this.navController.navigateBack(this.backTo());
  }
}
