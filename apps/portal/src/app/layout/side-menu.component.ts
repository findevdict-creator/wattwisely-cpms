import { Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '@wattwisely/ui';
import { PermissionsService } from '../core/permissions/permissions.service';
import { AlertBadgeService } from './alert-badge.service';
import { MenuItem } from './menu-item';
import { PortalMenu } from './portal-menu';
import { TenantSwitcherComponent } from './tenant-switcher.component';

/**
 * The side menu: the logo, the workspace, and the pages in groups (PortalMenu). Collapsed, it
 * shows their icons alone, with each page's name on hover.
 */
@Component({
  selector: 'ww-side-menu',
  imports: [LogoComponent, MatIconModule, MatTooltipModule, RouterLink, TenantSwitcherComponent],
  host: { '[class.collapsed]': 'isCollapsed()' },
  templateUrl: './side-menu.component.html',
  styleUrl: './side-menu.component.scss',
})
export class SideMenuComponent {
  /** The page shown now, which marks its item. */
  readonly url = input.required<string>();
  readonly isCollapsed = input(false);
  /** A link was followed; on a narrow screen the shell closes the menu. */
  readonly navigated = output();

  private readonly permissions = inject(PermissionsService);
  protected readonly alertBadge = inject(AlertBadgeService);
  protected readonly groups = computed(() => PortalMenu.groups(this.permissions));

  protected isActive(item: MenuItem): boolean {
    return PortalMenu.isActive(item, this.url());
  }
}
