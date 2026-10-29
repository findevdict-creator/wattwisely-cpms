import { Component, effect, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router } from '@angular/router';
import { IonButton, IonContent } from '@ionic/angular';
import { LogoComponent } from '@wattwisely/ui';
import { MobileAuthService } from '../../core/auth/mobile-auth.service';

/**
 * The first page after installing (Figma 8, "Welcome"): what the app is for, and the two
 * ways in. Both open Keycloak in the system browser; once it sends the phone back signed
 * in, the page moves on to Home by itself.
 */
@Component({
  selector: 'ww-welcome',
  imports: [IonButton, IonContent, LogoComponent, MatIconModule],
  templateUrl: './welcome.component.html',
  styleUrl: './welcome.component.scss',
})
export class WelcomeComponent {
  protected readonly auth = inject(MobileAuthService);
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      if (this.auth.hasSession()) {
        void this.router.navigateByUrl('/tabs/home', { replaceUrl: true });
      }
    });
  }
}
