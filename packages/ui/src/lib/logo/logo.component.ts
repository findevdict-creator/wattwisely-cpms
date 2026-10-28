import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** The Wattwisely mark, a bolt on the brand green, and the name beside it where there is room. */
@Component({
  selector: 'ww-logo',
  imports: [MatIconModule],
  template: `<span class="mark"><mat-icon svgIcon="zap" /></span>
    @if (!isMarkOnly()) {
      {{ name() }}
    }`,
  styles: `
    :host {
      display: inline-flex;
      gap: 10px;
      align-items: center;
      font: 600 17px/24px var(--ww-font);
      color: var(--mat-sys-on-surface);
    }
    .mark {
      display: grid;
      place-items: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      background: var(--mat-sys-primary);
      color: var(--mat-sys-on-primary);
    }
    mat-icon {
      width: 20px;
      height: 20px;
    }
  `,
})
export class LogoComponent {
  readonly name = input('Wattwisely');
  /** In the collapsed side menu, where there is room for the mark alone. */
  readonly isMarkOnly = input(false);
}
