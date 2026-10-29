import { Injectable, inject } from '@angular/core';
import { OAuthStorage } from 'angular-oauth2-oidc';
import { SecureVault } from '../native/secure-vault';

/**
 * Where the sign-in library keeps its tokens and its PKCE verifier. The library reads them
 * synchronously, so they are held in memory, loaded from the phone's secure storage at
 * start-up, and every change is written back to it.
 */
@Injectable({ providedIn: 'root' })
export class SecureTokenStore implements OAuthStorage {
  private readonly vault = inject(SecureVault);
  private readonly items = new Map<string, string>();

  async load(): Promise<void> {
    for (const key of await this.vault.keys()) {
      const value = await this.vault.get(key);
      if (value !== null) {
        this.items.set(key, value);
      }
    }
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null;
  }

  setItem(key: string, data: string): void {
    this.items.set(key, data);
    this.vault.set(key, data).catch((error: unknown) => SecureTokenStore.warn(key, error));
  }

  removeItem(key: string): void {
    this.items.delete(key);
    this.vault.remove(key).catch((error: unknown) => SecureTokenStore.warn(key, error));
  }

  private static warn(key: string, error: unknown): void {
    console.warn(`Could not update ${key} in secure storage`, error);
  }
}
