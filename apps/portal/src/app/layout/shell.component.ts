import { Component, DestroyRef, OnInit, inject, viewChild } from '@angular/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { RuntimeConfig } from '../core/config/runtime-config';
import { PermissionsService } from '../core/permissions/permissions.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { AlertBadgeService } from './alert-badge.service';
import { NotificationBellComponent } from './notification-bell.component';
import { QuietHoursDialogComponent } from './quiet-hours-dialog.component';
import { TenantSwitcherComponent } from './tenant-switcher.component';

/** The frame around every workspace page: top bar, side menu and the page itself. */
@Component({
  selector: 'ww-shell',
  imports: [
    MatBadgeModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
    RouterLink,
    RouterLinkActive,
    RouterOutlet,
    NotificationBellComponent,
    TenantSwitcherComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  /** How often the bell and the Alerts badge ask for news. */
  static readonly REFRESH_MS = 60_000;

  protected readonly tenantContext = inject(TenantContextService);
  protected readonly permissions = inject(PermissionsService);
  protected readonly alertBadge = inject(AlertBadgeService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly destroyRef = inject(DestroyRef);
  private readonly bell = viewChild(NotificationBellComponent);
  /** Only Wattwisely staff see the link; the console itself turns everyone else away. */
  protected readonly adminUrl = inject(RuntimeConfig).adminUrl;

  ngOnInit(): void {
    this.refresh();
    const timer = setInterval(() => this.refresh(), ShellComponent.REFRESH_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));
  }

  protected openQuietHours(): void {
    this.dialog.open(QuietHoursDialogComponent, { width: '440px' });
  }

  protected logout(): void {
    this.authService.logout();
  }

  private refresh(): void {
    void this.alertBadge.refresh();
    void this.bell()?.refresh();
  }
}
