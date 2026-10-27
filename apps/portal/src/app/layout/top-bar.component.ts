import { Component, inject, input, output, viewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { RouterLink } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { RuntimeConfig } from '../core/config/runtime-config';
import { PermissionsService } from '../core/permissions/permissions.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { Initials } from '../shared/initials';
import { NotificationBellComponent } from './notification-bell.component';
import { Where } from './page-location';
import { QuietHoursDialogComponent } from './quiet-hours-dialog.component';

/** The bar over every page: where you are, the managed badge, the bell, help and your account. */
@Component({
  selector: 'ww-top-bar',
  imports: [
    MatButtonModule,
    MatDividerModule,
    MatIconModule,
    MatMenuModule,
    NotificationBellComponent,
    RouterLink,
  ],
  templateUrl: './top-bar.component.html',
  styleUrl: './top-bar.component.scss',
})
export class TopBarComponent {
  readonly where = input.required<Where>();
  /** On a narrow screen the side menu hides and a button here opens it. */
  readonly isNarrow = input(false);
  readonly menuOpened = output();

  protected readonly tenantContext = inject(TenantContextService);
  protected readonly permissions = inject(PermissionsService);
  private readonly authService = inject(AuthService);
  private readonly dialog = inject(MatDialog);
  private readonly bell = viewChild(NotificationBellComponent);
  private readonly runtimeConfig = inject(RuntimeConfig);
  /** Only Wattwisely staff see the link; the console itself turns everyone else away. */
  protected readonly adminUrl = this.runtimeConfig.adminUrl;
  protected readonly helpUrl = this.runtimeConfig.helpUrl;
  protected readonly initials = Initials;

  /** Called by the shell when it starts and then every minute. */
  refresh(): void {
    void this.bell()?.refresh();
  }

  protected openQuietHours(): void {
    this.dialog.open(QuietHoursDialogComponent, { width: '440px' });
  }

  protected logout(): void {
    this.authService.logout();
  }
}
