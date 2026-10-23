import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { Me } from './models/me';

/** Calls GET /v1/me: who I am and whether I am Wattwisely staff. */
@Injectable({ providedIn: 'root' })
export class MeApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  getMe(): Observable<Me> {
    return this.http.get<Me>(`${this.runtimeConfig.apiUrl}/v1/me`);
  }
}
