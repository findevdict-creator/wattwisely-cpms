import { signal } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { ApiKeyInput } from '../../../core/api/models/api-key';
import { Permission } from '../../../core/api/models/role';

/** The API key dialog's fields and ticked permissions, and how they turn into the API's body (module 16). */
export class ApiKeyForm {
  /** What a key can never hold: a key that makes keys would outlive its own revocation. */
  static readonly NOT_FOR_KEYS = ['api_keys:manage'];

  readonly fields = new FormGroup({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(60)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(300)],
    }),
    /** A calendar day, yyyy-mm-dd, or empty for a key that never expires. */
    expiresOn: new FormControl('', { nonNullable: true }),
  });
  readonly permissions = signal<string[]>([]);

  /** The catalogue without the permissions a key cannot hold. */
  static selectable(permissions: Permission[]): Permission[] {
    return permissions.filter((permission) => !ApiKeyForm.NOT_FOR_KEYS.includes(permission.key));
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

  /** A name, at least one permission, and an expiry that is not in the past. */
  isValid(now: Date = new Date()): boolean {
    return this.fields.valid && this.permissions().length > 0 && !this.isExpiryPast(now);
  }

  isExpiryPast(now: Date = new Date()): boolean {
    const expiresAt = this.expiresAt();
    return expiresAt !== null && expiresAt.getTime() <= now.getTime();
  }

  toInput(): ApiKeyInput {
    const value = this.fields.getRawValue();
    return {
      name: value.name.trim(),
      description: value.description.trim(),
      permissions: [...this.permissions()],
      expires_at: this.expiresAt()?.toISOString() ?? null,
    };
  }

  /** The end of the chosen day, in the browser's time zone. */
  private expiresAt(): Date | null {
    const day = this.fields.getRawValue().expiresOn;
    if (!day) {
      return null;
    }
    const [year, month, date] = day.split('-').map(Number);
    return new Date(year, month - 1, date, 23, 59, 59);
  }
}
