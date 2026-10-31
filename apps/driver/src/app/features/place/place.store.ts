import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiProblem,
  Charge,
  MyChargesStore,
  Place,
  PublicApiService,
} from '@wattwisely/driver-core';

/** The plug a QR code named, and the start of a paid charge on it. */
@Injectable()
export class PlaceStore {
  private readonly api = inject(PublicApiService);
  private readonly myCharges = inject(MyChargesStore);

  readonly place = signal<Place | null>(null);
  readonly error = signal('');
  readonly isStarting = signal(false);

  async load(identity: string, connector: string): Promise<void> {
    this.error.set('');
    try {
      this.place.set(await firstValueFrom(this.api.place(identity, connector)));
    } catch (error) {
      this.error.set(PlaceStore.wordsFor(ApiProblem.from(error)));
    }
  }

  /**
   * Opens the session and the hold; the charge is remembered on this phone. Null when it failed.
   * `chatRef` comes from the link a driver got in a chat, so the chat follows the charge.
   */
  async start(chatRef?: string): Promise<Charge | null> {
    const place = this.place();
    if (!place) {
      return null;
    }
    this.isStarting.set(true);
    this.error.set('');
    try {
      const charge = await firstValueFrom(
        this.api.start(place.charger_identity, place.ocpp_connector_id, chatRef),
      );
      this.myCharges.remember(charge);
      return charge;
    } catch (error) {
      this.error.set(PlaceStore.wordsFor(ApiProblem.from(error)));
      return null;
    } finally {
      this.isStarting.set(false);
    }
  }

  private static wordsFor(problem: ApiProblem): string {
    if (problem.status === 404) {
      return 'There is no charger with this code. Check the sticker and try again.';
    }
    return problem.detail;
  }
}
