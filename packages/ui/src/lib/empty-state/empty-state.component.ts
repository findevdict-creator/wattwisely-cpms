import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** What a list or card shows when there is nothing in it yet, with what to do next below. */
@Component({
  selector: 'ww-empty-state',
  imports: [MatIconModule],
  template: `
    <span class="icon"><mat-icon [svgIcon]="icon()" /></span>
    <p class="heading">{{ heading() }}</p>
    @if (text()) {
      <p class="text">{{ text() }}</p>
    }
    <ng-content />
  `,
  styles: `
    :host {
      display: flex;
      flex-direction: column;
      gap: 8px;
      align-items: center;
      padding: 40px 24px;
      text-align: center;
    }
    .icon {
      display: grid;
      place-items: center;
      width: 48px;
      height: 48px;
      margin-bottom: 4px;
      border-radius: 50%;
      background: var(--mat-sys-surface-variant);
      color: var(--mat-sys-on-surface-variant);
    }
    .heading {
      margin: 0;
      font-size: 15px;
      line-height: 20px;
      font-weight: 600;
    }
    .text {
      max-width: 420px;
      margin: 0 0 8px;
      color: var(--mat-sys-on-surface-variant);
    }
  `,
})
export class EmptyStateComponent {
  readonly heading = input.required<string>();
  readonly text = input('');
  readonly icon = input('inbox');
}
