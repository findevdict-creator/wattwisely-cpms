import { Component, inject, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { NavController } from '@ionic/angular';

/**
 * The bar at the top of the charging pages (Figma 9 and 10): a way back, when the page has
 * one, and the operator whose plug it is, beside a bolt in the theme's color.
 */
@Component({
  selector: 'ww-top-bar',
  imports: [MatIconModule],
  template: `
    @if (backTo()) {
      <button type="button" class="back" aria-label="Back" (click)="back()" data-testid="back">
        <mat-icon svgIcon="arrow-left" />
      </button>
    }
    <span class="bolt"><mat-icon svgIcon="zap" /></span>
    <strong data-testid="operator">{{ operator() }}</strong>
  `,
  styles: `
    :host {
      display: flex;
      gap: 10px;
      align-items: center;
      min-height: 40px;
    }
    .back {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      margin-left: -8px;
      border: 0;
      border-radius: 999px;
      background: none;
      color: var(--ww-ink);
    }
    .bolt {
      display: grid;
      place-items: center;
      width: 28px;
      height: 28px;
      border-radius: 8px;
      background: var(--ww-brand);
      color: var(--ww-white);
    }
    .bolt mat-icon {
      width: 16px;
      height: 16px;
    }
    strong {
      font-size: 15px;
      line-height: 20px;
    }
  `,
})
export class TopBarComponent {
  readonly operator = input.required<string>();
  /** Where Back goes when the page was opened from a link and has nothing behind it. */
  readonly backTo = input<string | null>(null);

  private readonly navController = inject(NavController);

  protected back(): void {
    void this.navController.navigateBack(this.backTo() ?? '/tabs/home');
  }
}
