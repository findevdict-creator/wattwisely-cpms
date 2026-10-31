import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { EmptyStateComponent } from '@wattwisely/ui';

/**
 * The Charge tab. The camera scanner, the plug page and the charge itself arrive with the
 * charging module (Figma 9 and 10); until then the tab says so.
 */
@Component({
  selector: 'ww-charge',
  imports: [EmptyStateComponent, IonContent],
  template: `
    <ion-content>
      <div class="ww-page">
        <h1>Charge</h1>
        <ww-empty-state
          class="ww-card"
          icon="scan-qr-code"
          heading="Scanning comes in the next update"
          text="Until then, scan the QR code on the plug with the phone's camera: it opens the charging page in the browser."
          data-testid="charge-soon"
        />
      </div>
    </ion-content>
  `,
  styles: `
    h1 {
      margin: 0;
      font: 700 24px/30px var(--ww-font);
    }
  `,
})
export class ChargeComponent {}
