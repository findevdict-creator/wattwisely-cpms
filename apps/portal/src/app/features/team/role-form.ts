import { signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Role, RoleInput } from '../../core/api/models/role';

/** The role dialog's fields and ticked permissions, and how they turn into the API's body (module 14). */
export class RoleForm {
  readonly fields = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
  });
  readonly permissions = signal<string[]>([]);

  static from(role: Role): RoleForm {
    const form = new RoleForm();
    form.fields.setValue({ name: role.name, description: role.description });
    form.permissions.set([...role.permissions]);
    return form;
  }

  has(key: string): boolean {
    return this.permissions().includes(key);
  }

  hasAll(keys: string[]): boolean {
    return keys.length > 0 && keys.every((key) => this.has(key));
  }

  hasSome(keys: string[]): boolean {
    return keys.some((key) => this.has(key));
  }

  set(key: string, isTicked: boolean): void {
    this.setAll([key], isTicked);
  }

  /** Ticks or clears a whole module at once. */
  setAll(keys: string[], isTicked: boolean): void {
    this.permissions.update((current) => {
      const rest = current.filter((key) => !keys.includes(key));
      return isTicked ? [...rest, ...keys] : rest;
    });
  }

  /** Starts from another role's permissions, e.g. Technician plus a little more. */
  copyFrom(role: Role): void {
    this.permissions.set([...role.permissions]);
  }

  /** A name, and at least one permission: a role that allows nothing has no use. */
  isValid(): boolean {
    return this.fields.valid && this.permissions().length > 0;
  }

  toInput(): RoleInput {
    const value = this.fields.getRawValue();
    return {
      name: value.name.trim(),
      description: value.description.trim(),
      permissions: [...this.permissions()],
    };
  }
}
