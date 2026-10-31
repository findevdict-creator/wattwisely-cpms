import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

/** The two Team pages as tabs: the members, and the roles with their permissions. */
@Component({
  selector: 'ww-team-tabs',
  imports: [RouterLink, RouterLinkActive],
  template: `
    <nav class="ww-tabs" aria-label="Team">
      <a
        class="ww-tab"
        routerLink="/team"
        routerLinkActive="on"
        [routerLinkActiveOptions]="{ exact: true }"
        ariaCurrentWhenActive="page"
      >
        Members
      </a>
      <a
        class="ww-tab"
        routerLink="/team/roles"
        routerLinkActive="on"
        ariaCurrentWhenActive="page"
        data-testid="roles"
      >
        Roles and permissions
      </a>
    </nav>
  `,
})
export class TeamTabsComponent {}
