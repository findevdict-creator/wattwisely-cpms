import { Component, input } from '@angular/core';
import { ChipTone } from '@wattwisely/driver-core';

/**
 * A card that says why something cannot go ahead (Figma 10, "When a charge cannot start"): a
 * chip, a title and a sentence, with the way forward projected under them.
 */
@Component({
  selector: 'ww-notice-card',
  template: `
    <span class="ww-chip" [class]="tone()">{{ chip() }}</span>
    <strong data-testid="notice-title">{{ title() }}</strong>
    <p class="ww-lead" data-testid="notice-text">{{ text() }}</p>
    <ng-content />
  `,
  styles: `
    :host {
      align-items: flex-start;
    }
    strong {
      font-size: 16px;
      line-height: 22px;
    }
  `,
  host: { class: 'ww-card' },
})
export class NoticeCardComponent {
  readonly chip = input.required<string>();
  readonly tone = input.required<ChipTone>();
  readonly title = input.required<string>();
  readonly text = input.required<string>();
}
