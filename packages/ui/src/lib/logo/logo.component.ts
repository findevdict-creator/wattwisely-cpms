import { Component, booleanAttribute, input } from '@angular/core';
import { BrandMark } from '@wattwisely/theme';

/**
 * The Wattwisely logo in its own teal (`--ww-logo`): the mark and the name, or the mark alone
 * where there is no room for the name. It is drawn inline from BrandMark's paths, so it needs no
 * file and takes its color from theme.json. It is cut to the ring, so its height is the ring's and
 * its edges are the drawing's. Give the host a height or a color to change them.
 */
@Component({
  selector: 'ww-logo',
  host: { role: 'img', '[attr.aria-label]': 'name()' },
  template: `
    <svg [attr.viewBox]="isMarkOnly() ? brand.MARK_CROP : brand.LOCKUP_CROP" aria-hidden="true">
      <g
        [attr.transform]="isMarkOnly() ? null : brand.LOCKUP_MARK_TRANSFORM"
        fill="none"
        stroke="currentColor"
        [attr.stroke-width]="brand.STROKE_WIDTH"
      >
        <path [attr.d]="brand.RING" />
        <path [attr.d]="brand.W" stroke-linejoin="miter" stroke-miterlimit="6" />
      </g>
      @if (!isMarkOnly()) {
        <path [attr.d]="brand.NAME" fill="currentColor" />
      }
    </svg>
  `,
  styles: `
    :host {
      display: inline-block;
      height: 28px;
      color: var(--ww-logo);
    }
    svg {
      display: block;
      width: auto;
      height: 100%;
    }
  `,
})
export class LogoComponent {
  protected readonly brand = BrandMark;
  /** What a screen reader says for it. */
  readonly name = input('Wattwisely');
  /** In the collapsed side menu, where there is room for the mark alone. */
  readonly isMarkOnly = input(false, { transform: booleanAttribute });
}
