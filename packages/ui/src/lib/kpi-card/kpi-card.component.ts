import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

/** Which way a figure moved, which colors the line under it. */
export type KpiTrend = 'up' | 'down' | 'none';

/**
 * One headline figure: what it counts, the number, and a line under it such as the change on
 * the previous period. With a link the whole card opens the page behind the figure.
 */
@Component({
  selector: 'ww-kpi-card',
  imports: [MatIconModule, NgTemplateOutlet, RouterLink],
  template: `
    @if (link(); as to) {
      <a class="kpi" [class.alarm]="isAlarm()" [routerLink]="to">
        <ng-container [ngTemplateOutlet]="body" />
      </a>
    } @else {
      <div class="kpi" [class.alarm]="isAlarm()"><ng-container [ngTemplateOutlet]="body" /></div>
    }
    <ng-template #body>
      <span class="label">{{ label() }}</span>
      <span class="value">{{ value() }}</span>
      @if (foot()) {
        <span class="foot {{ trend() }}">
          @if (footIcon()) {
            <mat-icon [svgIcon]="footIcon()" />
          }
          {{ foot() }}
        </span>
      }
    </ng-template>
  `,
  styles: `
    :host {
      display: block;
      min-width: 0;
    }
    .kpi {
      display: flex;
      flex-direction: column;
      gap: 4px;
      height: 100%;
      box-sizing: border-box;
      padding: 16px 20px;
      border: 1px solid var(--mat-sys-outline-variant);
      border-radius: var(--ww-radius-lg);
      background: var(--mat-sys-surface);
      color: var(--mat-sys-on-surface);
      text-decoration: none;
    }
    a.kpi:hover {
      border-color: var(--mat-sys-outline);
    }
    .label {
      font-size: 13px;
      line-height: 18px;
      color: var(--mat-sys-on-surface-variant);
    }
    .value {
      font-size: 24px;
      line-height: 32px;
      font-weight: 600;
    }
    .alarm .value {
      color: var(--mat-sys-error);
    }
    .foot {
      display: flex;
      gap: 4px;
      align-items: center;
      font-size: 12px;
      line-height: 16px;
      font-weight: 500;
      color: var(--mat-sys-on-surface-variant);
    }
    .foot.up {
      color: var(--ww-brand-dark);
    }
    .foot.down {
      color: var(--ww-danger-text);
    }
    mat-icon {
      width: 14px;
      height: 14px;
    }
  `,
})
export class KpiCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string>();
  readonly foot = input('');
  readonly trend = input<KpiTrend>('none');
  /** An icon before the foot; by default an arrow for a trend and none otherwise. */
  readonly icon = input('');
  readonly isAlarm = input(false);
  readonly link = input<string | readonly unknown[] | null>(null);

  protected readonly footIcon = computed(() => {
    const trend = this.trend();
    return this.icon() || (trend === 'none' ? '' : `trending-${trend}`);
  });
}
