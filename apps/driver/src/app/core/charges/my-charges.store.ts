import { Injectable, signal } from '@angular/core';
import { Charge } from '../api/models/charge';
import { RememberedCharge, RememberedCharges } from './remembered-charge';

/**
 * The charges started from this phone, newest first, kept in the browser's storage: the
 * charge key is the only way back to a charge, and a driver has no account yet. A
 * driver account that keeps the list across phones comes with a later module.
 */
@Injectable({ providedIn: 'root' })
export class MyChargesStore {
  static readonly STORAGE_KEY = 'wattwisely.charges';
  static readonly LIMIT = 20;

  readonly charges = signal<RememberedCharge[]>(this.read());

  remember(charge: Charge): void {
    const remembered = RememberedCharges.of(charge);
    const others = this.charges().filter((item) => item.key !== remembered.key);
    this.write([remembered, ...others].slice(0, MyChargesStore.LIMIT));
  }

  forget(key: string): void {
    this.write(this.charges().filter((item) => item.key !== key));
  }

  private read(): RememberedCharge[] {
    try {
      const json = localStorage.getItem(MyChargesStore.STORAGE_KEY);
      return json ? (JSON.parse(json) as RememberedCharge[]) : [];
    } catch {
      return [];
    }
  }

  private write(charges: RememberedCharge[]): void {
    this.charges.set(charges);
    try {
      localStorage.setItem(MyChargesStore.STORAGE_KEY, JSON.stringify(charges));
    } catch {
      // Private browsing or a full store: the list lives only until the page is closed.
    }
  }
}
