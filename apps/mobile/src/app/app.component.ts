import { ChangeDetectionStrategy, Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular';

/**
 * The root of the mobile app (module 30): Ionic's app frame and its router outlet, which
 * keeps each tab's page alive and animates between pages as the phone does. Checked eagerly,
 * as Ionic asks of the component that holds its outlet.
 */
@Component({
  selector: 'ww-root',
  imports: [IonApp, IonRouterOutlet],
  // Ionic's outlet attaches pages itself; its host must be checked eagerly (Ionic 9 with Angular 22).
  // eslint-disable-next-line @angular-eslint/prefer-on-push-component-change-detection
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <ion-app>
      <ion-router-outlet />
    </ion-app>
  `,
})
export class AppComponent {}
