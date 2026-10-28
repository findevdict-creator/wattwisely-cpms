import { Injectable, signal } from '@angular/core';

/**
 * Whether the side menu of the portal and the console is a strip of icons rather than the full
 * list. The choice is remembered in this browser; where the browser keeps nothing, it lasts until
 * the page is reloaded.
 */
@Injectable({ providedIn: 'root' })
export class SideMenuState {
  static readonly KEY = 'wattwisely.side-menu';
  static readonly COLLAPSED = 'collapsed';

  private readonly state = signal(SideMenuState.read());
  readonly isCollapsed = this.state.asReadonly();

  toggle(): void {
    const isCollapsed = !this.state();
    this.state.set(isCollapsed);
    SideMenuState.write(isCollapsed);
  }

  private static read(): boolean {
    try {
      return localStorage.getItem(SideMenuState.KEY) === SideMenuState.COLLAPSED;
    } catch {
      return false;
    }
  }

  private static write(isCollapsed: boolean): void {
    try {
      if (isCollapsed) {
        localStorage.setItem(SideMenuState.KEY, SideMenuState.COLLAPSED);
      } else {
        localStorage.removeItem(SideMenuState.KEY);
      }
    } catch {
      // Storage is blocked: the menu stays as chosen until the page is reloaded.
    }
  }
}
