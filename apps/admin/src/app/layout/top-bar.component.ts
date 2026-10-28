import { Component, computed, inject, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../core/auth/auth.service';
import { RuntimeConfig } from '../core/config/runtime-config';
import { StaffContextService } from '../core/staff/staff-context.service';
import { Initials } from '../shared/initials';
import { Where } from './admin-menu';

/** The bar over every page: where you are, a link to the tenant portal and your account. */
@Component({
  selector: 'ww-top-bar',
  imports: [MatButtonModule, MatDividerModule, MatIconModule, MatMenuModule, MatTooltipModule],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  readonly where = input.required<Where>();
  /** On a narrow screen the side menu hides and a button here opens it. */
  readonly isNarrow = input(false);
  readonly menuOpened = output();
  /** On a wide screen the same button collapses the side menu to its icons, and expands it. */
  readonly isMenuCollapsed = input(false);
  readonly menuToggled = output();
  protected readonly toggleLabel = computed(() =>
    this.isMenuCollapsed() ? 'Expand the menu' : 'Collapse the menu',
  );

  protected readonly staff = inject(StaffContextService);
  protected readonly portalUrl = inject(RuntimeConfig).portalUrl;
  protected readonly initials = Initials;
  private readonly authService = inject(AuthService);

  protected logout(): void {
    this.authService.logout();
  }
}
