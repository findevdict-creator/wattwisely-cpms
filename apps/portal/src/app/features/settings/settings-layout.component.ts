import { Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { PermissionsService } from '../../core/permissions/permissions.service';
import { SettingsMenu } from '../../layout/settings-menu';

/** Settings: the menu of settings pages on the left (SettingsMenu), the page on the right. */
@Component({
  selector: 'ww-settings-layout',
  imports: [MatIconModule, RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <nav class="menu" aria-label="Settings">
      @for (group of groups(); track group.heading) {
        <span class="ww-overline group">{{ group.heading }}</span>
        @for (item of group.items; track item.testId) {
          <a
            class="nav"
            [routerLink]="item.link"
            routerLinkActive="on"
            ariaCurrentWhenActive="page"
            [attr.data-testid]="item.testId"
          >
            <mat-icon [svgIcon]="item.icon" />
            {{ item.label }}
          </a>
        }
      }
    </nav>
    <div class="page"><router-outlet /></div>
  `,
  styles: `
    :host {
      display: flex;
      flex-wrap: wrap;
      gap: 32px;
      align-items: flex-start;
    }
    .menu {
      display: flex;
      flex: 0 0 240px;
      flex-direction: column;
      gap: 2px;
    }
    .group {
      padding: 0 12px 8px;
    }
    .group:not(:first-child) {
      padding-top: 16px;
    }
    .nav {
      display: flex;
      gap: 12px;
      align-items: center;
      height: 36px;
      padding: 0 12px;
      border-radius: 8px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
      text-decoration: none;
    }
    .nav mat-icon {
      width: 20px;
      height: 20px;
      color: var(--mat-sys-on-surface-variant);
    }
    .nav:hover {
      background: var(--mat-sys-surface-variant);
    }
    .nav.on {
      font-weight: 600;
      background: var(--mat-sys-primary-container);
      color: var(--mat-sys-on-primary-container);
    }
    .nav.on mat-icon {
      color: var(--mat-sys-on-primary-container);
    }
    .page {
      flex: 999 1 560px;
      min-width: 0;
    }
  `,
})
export class SettingsLayoutComponent {
  private readonly permissions = inject(PermissionsService);
  protected readonly groups = computed(() => SettingsMenu.groups(this.permissions));
}
