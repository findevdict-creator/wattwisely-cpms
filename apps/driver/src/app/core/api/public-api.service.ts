import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { Charge } from './models/charge';
import { Place } from './models/place';

/** Calls the public endpoints a driver's page uses: no login, the charge key is the proof. */
@Injectable({ providedIn: 'root' })
export class PublicApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  place(chargerIdentity: string, ocppConnectorId: string): Observable<Place> {
    const identity = encodeURIComponent(chargerIdentity);
    return this.http.get<Place>(this.url(`public/places/${identity}/${ocppConnectorId}`));
  }

  /** Opens the session and the card hold; the answer carries what the card form needs. */
  start(chargerIdentity: string, ocppConnectorId: number): Observable<Charge> {
    return this.http.post<Charge>(this.url('public/charges'), {
      charger_identity: chargerIdentity,
      ocpp_connector_id: ocppConnectorId,
    });
  }

  charge(key: string): Observable<Charge> {
    return this.http.get<Charge>(this.url(`public/charges/${key}`));
  }

  /** After the card form finished: the API reads the hold now and starts the charger. */
  check(key: string): Observable<Charge> {
    return this.http.post<Charge>(this.url(`public/charges/${key}/check`), {});
  }

  stop(key: string): Observable<Charge> {
    return this.http.post<Charge>(this.url(`public/charges/${key}/stop`), {});
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
