import { Component } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { EmptyStateComponent } from '@wattwisely/ui';

/** The Sessions tab. The driver's charges at every operator fill it with the account module. */
@Component({
  selector: 'ww-sessions',
  imports: [EmptyStateComponent, IonContent],
  template: `
    <ion-content>
      <div class="ww-page">
        <h1>My sessions</h1>
        <ww-empty-state
          class="ww-card"
          icon="history"
          heading="Your charges will be listed here"
          text="Every charge with this login, at every operator, with its receipt."
          data-testid="sessions-soon"
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
export class SessionsComponent {}
