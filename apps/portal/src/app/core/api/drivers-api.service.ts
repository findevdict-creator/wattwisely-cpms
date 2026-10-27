import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import {
  CardInput,
  Driver,
  DriverDetail,
  DriverInput,
  DriverPage,
  DriverPaymentMode,
  RfidCard,
  RfidCardStatus,
} from './models/driver';

/** Answer to inviting a driver: the driver, and whether the e-mail left. */
export interface DriverInviteResult {
  driver: DriverDetail;
  is_email_sent: boolean;
}

/** The filters of the drivers list. */
export interface DriversFilter {
  q?: string;
  status?: string;
  group_id?: string;
}

/**
 * Calls /v1/drivers, the cards under it (stories DRV-01 to DRV-03) and the driver's login
 * (module 19, story DRV-04). Changes carry the version seen.
 */
@Injectable({ providedIn: 'root' })
export class DriversApiService {
  static readonly PAGE_SIZE = 50;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  list(filter: DriversFilter = {}, cursor: string | null = null): Observable<DriverPage> {
    let params = new HttpParams().set('limit', DriversApiService.PAGE_SIZE);
    for (const [key, value] of Object.entries(filter)) {
      params = value ? params.set(key, value) : params;
    }
    params = cursor ? params.set('cursor', cursor) : params;
    return this.http.get<DriverPage>(this.url('drivers'), { params });
  }

  get(id: string): Observable<DriverDetail> {
    return this.http.get<DriverDetail>(this.url(`drivers/${id}`));
  }

  create(input: DriverInput): Observable<DriverDetail> {
    return this.http.post<DriverDetail>(this.url('drivers'), input);
  }

  update(driver: Driver, changes: Partial<DriverInput>): Observable<DriverDetail> {
    return this.http.patch<DriverDetail>(this.url(`drivers/${driver.id}`), changes, {
      headers: this.ifMatch(driver),
    });
  }

  block(driver: Driver, reason: string): Observable<DriverDetail> {
    return this.http.post<DriverDetail>(
      this.url(`drivers/${driver.id}/block`),
      { reason },
      { headers: this.ifMatch(driver) },
    );
  }

  unblock(driver: Driver): Observable<DriverDetail> {
    return this.http.post<DriverDetail>(
      this.url(`drivers/${driver.id}/unblock`),
      {},
      { headers: this.ifMatch(driver) },
    );
  }

  remove(driver: Driver): Observable<void> {
    return this.http.delete<void>(this.url(`drivers/${driver.id}`), {
      headers: this.ifMatch(driver),
    });
  }

  addCard(driverId: string, input: CardInput): Observable<RfidCard> {
    return this.http.post<RfidCard>(this.url(`drivers/${driverId}/cards`), input);
  }

  setCardStatus(card: RfidCard, status: RfidCardStatus): Observable<RfidCard> {
    return this.updateCard(card, { status });
  }

  setCardPaymentMode(card: RfidCard, mode: DriverPaymentMode): Observable<RfidCard> {
    return this.updateCard(card, { payment_mode: mode });
  }

  /** E-mails the driver a link to the app; `email` overrides the address on the record. */
  invite(driverId: string, email: string | null): Observable<DriverInviteResult> {
    return this.http.post<DriverInviteResult>(
      this.url(`drivers/${driverId}/invite`),
      email ? { email } : {},
    );
  }

  resendInvite(driverId: string): Observable<DriverInviteResult> {
    return this.http.post<DriverInviteResult>(this.url(`drivers/${driverId}/invite/resend`), {});
  }

  cancelInvite(driverId: string): Observable<void> {
    return this.http.delete<void>(this.url(`drivers/${driverId}/invite`));
  }

  /** The driver's login stops seeing this operator; the record and its cards stay. */
  unlink(driver: Driver): Observable<void> {
    return this.http.delete<void>(this.url(`drivers/${driver.id}/account-link`), {
      headers: this.ifMatch(driver),
    });
  }

  private updateCard(
    card: RfidCard,
    changes: { status?: RfidCardStatus; payment_mode?: DriverPaymentMode },
  ): Observable<RfidCard> {
    return this.http.patch<RfidCard>(
      this.url(`drivers/${card.driver_id}/cards/${card.id}`),
      changes,
      { headers: this.ifMatch(card) },
    );
  }

  private ifMatch(record: { version: number }): Record<string, string> {
    return { 'If-Match': String(record.version) };
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
