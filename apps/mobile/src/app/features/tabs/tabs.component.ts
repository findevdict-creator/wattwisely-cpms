import { Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { IonLabel, IonTabBar, IonTabButton, IonTabs } from '@ionic/angular';

/**
 * The four tabs at the foot of every signed-in page, as in the design: Home, Charge,
 * Sessions and Account. Each tab keeps its own history of pages.
 */
@Component({
  selector: 'ww-tabs',
  imports: [IonLabel, IonTabBar, IonTabButton, IonTabs, MatIconModule],
  template: `
    <ion-tabs>
      <ion-tab-bar slot="bottom">
        <ion-tab-button tab="home" data-testid="tab-home">
          <mat-icon svgIcon="house" />
          <ion-label>Home</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="charge" data-testid="tab-charge">
          <mat-icon svgIcon="scan-qr-code" />
          <ion-label>Charge</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="sessions" data-testid="tab-sessions">
          <mat-icon svgIcon="history" />
          <ion-label>Sessions</ion-label>
        </ion-tab-button>
        <ion-tab-button tab="account" data-testid="tab-account">
          <mat-icon svgIcon="circle-user-round" />
          <ion-label>Account</ion-label>
        </ion-tab-button>
      </ion-tab-bar>
    </ion-tabs>
  `,
  styles: `
    ion-tab-button mat-icon {
      width: 24px;
      height: 24px;
      margin-bottom: 2px;
    }
    ion-label {
      font-size: 11px;
      font-weight: 500;
    }
  `,
})
export class TabsComponent {}
