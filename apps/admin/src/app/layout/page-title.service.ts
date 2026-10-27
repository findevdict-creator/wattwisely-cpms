import { Injectable, signal } from '@angular/core';

/**
 * The title of a page under a menu item, such as one tenant, for the top bar. The page sets it
 * once it has loaded; the shell clears it when the user moves on.
 */
@Injectable({ providedIn: 'root' })
export class PageTitleService {
  private readonly detailState = signal('');

  readonly detail = this.detailState.asReadonly();

  set(detail: string): void {
    this.detailState.set(detail);
  }

  clear(): void {
    this.detailState.set('');
  }
}
