import { Injectable, inject, signal } from '@angular/core';
import { NavController } from '@ionic/angular';
import { ApiProblem, DriverChargesApiService, DriverPlace } from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';
import { PushRegistrar } from '../notifications/push-registrar';

/**
 * Starts a charge on a plug with the driver's default card, or for free when the operator
 * says so (POST /v1/driver/charges), then puts the session page in place of the pages that
 * led to it, so Back from the charge goes Home rather than to the plug again. The first
 * charge is when the phone asks whether the app may notify (module 34).
 */
@Injectable()
export class ChargeStarter {
  private readonly api = inject(DriverChargesApiService);
  private readonly navController = inject(NavController);
  private readonly pushes = inject(PushRegistrar);

  readonly isStarting = signal(false);
  readonly error = signal('');

  async start(place: DriverPlace, isConsentGiven: boolean): Promise<void> {
    this.isStarting.set(true);
    this.error.set('');
    try {
      const charge = await firstValueFrom(
        this.api.start(place.charger_identity, place.ocpp_connector_id, isConsentGiven),
      );
      await this.navController.navigateRoot(['/charges', charge.id]);
      void this.pushes.enable(true);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isStarting.set(false);
    }
  }

  /** The page after the plug's: consent at a new operator, then the card for a paid charge. */
  static next(place: DriverPlace, isConsentGiven: boolean): 'consent' | 'card' | 'start' {
    if (place.access.needs_consent && !isConsentGiven) {
      return 'consent';
    }
    return place.access.payment.outcome === 'pay' ? 'card' : 'start';
  }
}
