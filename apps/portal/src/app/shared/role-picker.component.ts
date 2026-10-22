import { Component, input, model } from '@angular/core';
import { MatCheckboxChange, MatCheckboxModule } from '@angular/material/checkbox';
import { Role } from '../core/api/models/role';

/**
 * Tick the roles someone should have. Roles cover the whole tenant for now;
 * choosing sites arrives with the sites module (the API already accepts site_ids).
 */
@Component({
  selector: 'ww-role-picker',
  imports: [MatCheckboxModule],
  templateUrl: './role-picker.component.html',
  styleUrl: './role-picker.component.scss',
})
export class RolePickerComponent {
  readonly roles = input.required<Role[]>();
  readonly selectedIds = model<string[]>([]);

  protected isSelected(role: Role): boolean {
    return this.selectedIds().includes(role.id);
  }

  protected toggle(role: Role, change: MatCheckboxChange): void {
    const others = this.selectedIds().filter((id) => id !== role.id);
    this.selectedIds.set(change.checked ? [...others, role.id] : others);
  }
}
