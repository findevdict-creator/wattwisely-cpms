import { Component, input, model } from '@angular/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { Role, RoleAssignment } from '../core/api/models/role';

/** The little a site picker needs to know about a site. */
export interface SiteOption {
  id: string;
  name: string;
}

/**
 * Tick the roles someone should have, and for each one whether it covers the whole company
 * or chosen sites (story ACC-02). Without sites to choose from, every role covers the company.
 */
@Component({
  selector: 'ww-role-picker',
  imports: [MatCheckboxModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './role-picker.component.html',
  styleUrl: './role-picker.component.scss',
})
export class RolePickerComponent {
  readonly roles = input.required<Role[]>();
  readonly sites = input<SiteOption[]>([]);
  readonly assignments = model<RoleAssignment[]>([]);

  protected assignmentOf(role: Role): RoleAssignment | undefined {
    return this.assignments().find((assignment) => assignment.role_id === role.id);
  }

  protected toggle(role: Role, change: MatCheckboxChange): void {
    const others = this.assignments().filter((assignment) => assignment.role_id !== role.id);
    this.assignments.set(change.checked ? [...others, { role_id: role.id }] : others);
  }

  /** "all" for the whole company; otherwise chosen sites, starting with none. */
  protected setScope(role: Role, scope: string): void {
    this.replace(role, scope === 'all' ? { role_id: role.id } : { role_id: role.id, site_ids: [] });
  }

  protected setSites(role: Role, siteIds: string[]): void {
    this.replace(role, { role_id: role.id, site_ids: siteIds });
  }

  private replace(role: Role, assignment: RoleAssignment): void {
    this.assignments.update((assignments) =>
      assignments.map((current) => (current.role_id === role.id ? assignment : current)),
    );
  }
}
