import { Component, computed, inject, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { LogoComponent } from '@wattwisely/ui';
import { StaffContextService } from '../core/staff/staff-context.service';
import { Initials } from '../shared/initials';
import { AdminMenu, AdminMenuItem } from './admin-menu';

/** The side menu: the logo with the Staff console chip, the pages in groups, and who you are. */
@Component({
  selector: 'ww-side-menu',
  imports: [LogoComponent, MatIconModule, RouterLink],
  templateUrl: './side-menu.component.html',
  styleUrl: './side-menu.component.scss',
})
export class SideMenuComponent {
  /** The page shown now, which marks its item. */
  readonly url = input.required<string>();
  /** A link was followed; on a narrow screen the shell closes the menu. */
  readonly navigated = output();

  protected readonly staff = inject(StaffContextService);
  protected readonly groups = computed(() => {
    this.staff.me();
    return AdminMenu.visible((permission) => this.staff.can(permission));
  });
  protected readonly initials = computed(() => {
    const me = this.staff.me();
    return me ? Initials.of(me.name || me.email) : '';
  });

  protected isActive(item: AdminMenuItem): boolean {
    return AdminMenu.isActive(item, this.url());
  }
}
