import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { Subscription } from './models/subscription';

/** Calls GET /v1/subscription: the company's plan, usage and modules. */
@Injectable({ providedIn: 'root' })
export class SubscriptionApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  get(): Observable<Subscription> {
    return this.http.get<Subscription>(`${this.runtimeConfig.apiUrl}/v1/subscription`);
  }
}
