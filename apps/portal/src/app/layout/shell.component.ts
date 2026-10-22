import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { PermissionsService } from '../core/permissions/permissions.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { TenantSwitcherComponent } from './tenant-switcher.component';

/** The frame around every workspace page: top bar, side menu and the page itself. */
@Component({
  selector: 'ww-shell',
  imports: [
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    TenantSwitcherComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent {
  protected readonly tenantContext = inject(TenantContextService);
  protected readonly permissions = inject(PermissionsService);
  private readonly authService = inject(AuthService);

  protected logout(): void {
    this.authService.logout();
  }
}
