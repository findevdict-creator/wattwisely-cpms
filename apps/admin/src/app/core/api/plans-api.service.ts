import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { Addon, Plan, PlanRequest, ProductModule } from './models/plan';

/** Calls /v1/admin/plans, /v1/admin/addons and /v1/admin/modules. */
@Injectable({ providedIn: 'root' })
export class PlansApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  listPlans(): Observable<Plan[]> {
    return this.http.get<Plan[]>(`${this.base}/plans`);
  }

  createPlan(body: PlanRequest): Observable<Plan> {
    return this.http.post<Plan>(`${this.base}/plans`, body);
  }

  updatePlan(plan: Plan, body: PlanRequest): Observable<Plan> {
    return this.http.patch<Plan>(`${this.base}/plans/${plan.id}`, body, this.ifMatch(plan.version));
  }

  listAddons(): Observable<Addon[]> {
    return this.http.get<Addon[]>(`${this.base}/addons`);
  }

  updateAddon(addon: Addon, body: Partial<Addon>): Observable<Addon> {
    return this.http.patch<Addon>(
      `${this.base}/addons/${addon.key}`,
      body,
      this.ifMatch(addon.version),
    );
  }

  listModules(): Observable<ProductModule[]> {
    return this.http.get<ProductModule[]>(`${this.base}/modules`);
  }

  private get base(): string {
    return `${this.runtimeConfig.apiUrl}/v1/admin`;
  }

  private ifMatch(version: number) {
    return { headers: { 'If-Match': String(version) } };
  }
}
