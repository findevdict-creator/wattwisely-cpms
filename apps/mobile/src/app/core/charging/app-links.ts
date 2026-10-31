import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NativeApp } from '../native/native-app';
import { PlugCode } from './plug-code';

/**
 * The driver web app's addresses that open the app instead of the browser (module 32): a
 * plug's QR code, /c/<charger>/<plug>, and an operator's invitation, /invitations/<token>.
 * Android's App Links and iOS's Universal Links hand them over once the phone has checked
 * the domain's .well-known files; the sign-in's own links go to MobileAuthService.
 */
@Injectable({ providedIn: 'root' })
export class AppLinks {
  static readonly INVITATION = /^https?:\/\/[^/]+\/invitations\/([^/?#]+)/;

  private readonly nativeApp = inject(NativeApp);
  private readonly router = inject(Router);

  listen(): void {
    this.nativeApp.onUrlOpen((url) => void this.open(url));
  }

  /** The app's route for the address, or null when the address is not one of these. */
  static route(url: string): string[] | null {
    if (!/^https?:\/\//.test(url)) {
      return null;
    }
    const invitation = AppLinks.INVITATION.exec(url);
    if (invitation) {
      return ['/invitations', invitation[1]];
    }
    const plug = PlugCode.parse(url);
    return plug ? PlugCode.route(plug) : null;
  }

  private async open(url: string): Promise<void> {
    const route = AppLinks.route(url);
    if (route) {
      await this.router.navigate(route);
    }
  }
}
