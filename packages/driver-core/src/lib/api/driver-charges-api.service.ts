import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  CardSetup,
  ChargeReading,
  DriverCharge,
  DriverChargeDetail,
  DriverPlace,
  PaymentMethod,
  PaymentMethods,
} from './models/driver-payments';

/** Calls /v1/driver for paying and charging with a login (module 19): saved cards, plugs and charges. */
@Injectable({ providedIn: 'root' })
export class DriverChargesApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  paymentMethods(): Observable<PaymentMethods> {
    return this.http.get<PaymentMethods>(this.url('payment-methods'));
  }

  /** Opens a setup for the provider's card form. */
  setupCard(): Observable<CardSetup> {
    return this.http.post<CardSetup>(this.url('payment-methods/setup'), {});
  }

  /** The form confirmed the card: the API reads it back and keeps it. */
  saveCard(setupId: string): Observable<PaymentMethod> {
    return this.http.post<PaymentMethod>(this.url('payment-methods'), { setup_id: setupId });
  }

  makeDefault(id: string): Observable<PaymentMethod> {
    return this.http.patch<PaymentMethod>(this.url(`payment-methods/${id}`), { is_default: true });
  }

  removeCard(id: string): Observable<void> {
    return this.http.delete<void>(this.url(`payment-methods/${id}`));
  }

  place(chargerIdentity: string, connector: string): Observable<DriverPlace> {
    const identity = encodeURIComponent(chargerIdentity);
    return this.http.get<DriverPlace>(this.url(`places/${identity}/${connector}`));
  }

  /** Starts with the saved card, or free when the operator says so; consent makes a record at a new operator. */
  start(chargerIdentity: string, ocppConnectorId: number, isConsentGiven: boolean) {
    return this.http.post<DriverChargeDetail>(this.url('charges'), {
      charger_identity: chargerIdentity,
      ocpp_connector_id: ocppConnectorId,
      is_consent_given: isConsentGiven,
    });
  }

  charges(): Observable<{ items: DriverCharge[] }> {
    return this.http.get<{ items: DriverCharge[] }>(this.url('charges'));
  }

  charge(id: string): Observable<DriverChargeDetail> {
    return this.http.get<DriverChargeDetail>(this.url(`charges/${id}`));
  }

  /** The charge's readings, oldest first, for the power chart. */
  readings(id: string): Observable<ChargeReading[]> {
    return this.http.get<ChargeReading[]>(this.url(`charges/${id}/readings`));
  }

  stop(id: string): Observable<DriverChargeDetail> {
    return this.http.post<DriverChargeDetail>(this.url(`charges/${id}/stop`), {});
  }

  /** The CSV file, fetched with the login so the download needs no token in its URL. */
  export(): Observable<Blob> {
    return this.http.get(this.url('charges/export'), { responseType: 'blob' });
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/driver/${path}`;
  }
}
