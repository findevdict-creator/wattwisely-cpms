import { Injectable } from '@angular/core';
import { SecureStorage } from '@aparajita/capacitor-secure-storage';

/**
 * The phone's secure storage: the iOS Keychain and the Android Keystore. Only the sign-in's
 * tokens are kept here, under their own prefix. In a browser the plugin falls back to
 * localStorage, which is fine for development only.
 */
@Injectable({ providedIn: 'root' })
export class SecureVault {
  static readonly PREFIX = 'ww-auth.';

  private readonly prefixed = SecureStorage.setKeyPrefix(SecureVault.PREFIX);

  async keys(): Promise<string[]> {
    await this.prefixed;
    return SecureStorage.keys();
  }

  async get(key: string): Promise<string | null> {
    await this.prefixed;
    return SecureStorage.getItem(key);
  }

  async set(key: string, value: string): Promise<void> {
    await this.prefixed;
    return SecureStorage.setItem(key, value);
  }

  async remove(key: string): Promise<void> {
    await this.prefixed;
    return SecureStorage.removeItem(key);
  }
}
