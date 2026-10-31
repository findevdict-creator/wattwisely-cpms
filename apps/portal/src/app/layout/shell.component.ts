import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, OnInit, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatIconModule } from '@angular/material/icon';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, NavigationStart, Router, RouterLink, RouterOutlet } from '@angular/router';
import { SideMenuState } from '@wattwisely/ui';
import { filter, map } from 'rxjs';
import { PermissionsService } from '../core/permissions/permissions.service';
import { TenantContextService } from '../core/tenant/tenant-context.service';
import { AlertBadgeService } from './alert-badge.service';
import { PageLocation } from './page-location';
import { PageTitleService } from './page-title.service';
import { SideMenuComponent } from './side-menu.component';
import { TopBarComponent } from './top-bar.component';

/**
 * The frame around every workspace page: the side menu, the top bar, notices about the
 * account, and the page itself. Below 960px the side menu slides in over the page.
 */
@Component({
  selector: 'ww-shell',
  imports: [
    MatIconModule,
    MatSidenavModule,
    RouterLink,
    RouterOutlet,
    SideMenuComponent,
    TopBarComponent,
  ],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  /** How often the bell and the Alerts badge ask for news. */
  static readonly REFRESH_MS = 60_000;
  static readonly NARROW = '(max-width: 959px)';

  protected readonly permissions = inject(PermissionsService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly alertBadge = inject(AlertBadgeService);
  private readonly pageTitle = inject(PageTitleService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly topBar = viewChild(TopBarComponent);
  private readonly drawer = viewChild(MatSidenav);

  protected readonly isNarrow = toSignal(
    inject(BreakpointObserver)
      .observe(ShellComponent.NARROW)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly sideMenu = inject(SideMenuState);
  /** The menu as a strip of icons: only beside the page, never when it slides in. */
  protected readonly isRail = computed(() => !this.isNarrow() && this.sideMenu.isCollapsed());
  protected readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly where = computed(() =>
    PageLocation.of(
      this.url(),
      this.tenantContext.currentTenant()?.name ?? '',
      this.pageTitle.detail(),
    ),
  );

  ngOnInit(): void {
    this.refresh();
    const timer = setInterval(() => this.refresh(), ShellComponent.REFRESH_MS);
    const navigations = this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => this.pageTitle.clear());
    this.destroyRef.onDestroy(() => {
      clearInterval(timer);
      navigations.unsubscribe();
    });
  }

  protected closeIfNarrow(): void {
    if (this.isNarrow()) {
      void this.drawer()?.close();
    }
  }

  private refresh(): void {
    void this.alertBadge.refresh();
    this.topBar()?.refresh();
  }
}
