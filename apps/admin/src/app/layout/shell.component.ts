import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, DestroyRef, OnInit, computed, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { NavigationEnd, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { AdminMenu } from './admin-menu';
import { PageTitleService } from './page-title.service';
import { SideMenuComponent } from './side-menu.component';
import { TopBarComponent } from './top-bar.component';

/**
 * The frame around every console page: the side menu, the top bar and the page itself.
 * Below 960px the side menu slides in over the page.
 */
@Component({
  selector: 'ww-shell',
  imports: [MatSidenavModule, RouterOutlet, SideMenuComponent, TopBarComponent],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit {
  static readonly NARROW = '(max-width: 959px)';

  private readonly pageTitle = inject(PageTitleService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly drawer = viewChild(MatSidenav);

  protected readonly isNarrow = toSignal(
    inject(BreakpointObserver)
      .observe(ShellComponent.NARROW)
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
  protected readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  protected readonly where = computed(() => AdminMenu.where(this.url(), this.pageTitle.detail()));

  ngOnInit(): void {
    const navigations = this.router.events
      .pipe(filter((event) => event instanceof NavigationStart))
      .subscribe(() => this.pageTitle.clear());
    this.destroyRef.onDestroy(() => navigations.unsubscribe());
  }

  protected closeIfNarrow(): void {
    if (this.isNarrow()) {
      void this.drawer()?.close();
    }
  }
}
