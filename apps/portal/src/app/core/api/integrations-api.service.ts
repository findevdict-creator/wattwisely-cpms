import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { ApiKey, ApiKeyInput, CreatedApiKey } from './models/api-key';
import { WebhookDelivery, WebhookEndpoint, WebhookEventType, WebhookInput } from './models/webhook';

/** Calls /v1/api-keys and /v1/webhooks: access for the company's own systems (module 16). */
@Injectable({ providedIn: 'root' })
export class IntegrationsApiService {
  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  listKeys(): Observable<ApiKey[]> {
    return this.http.get<ApiKey[]>(this.url('api-keys'));
  }

  createKey(input: ApiKeyInput): Observable<CreatedApiKey> {
    return this.http.post<CreatedApiKey>(this.url('api-keys'), input);
  }

  renameKey(key: ApiKey, changes: { name: string; description: string }): Observable<ApiKey> {
    return this.http.patch<ApiKey>(this.url(`api-keys/${key.id}`), changes, this.ifMatch(key));
  }

  revokeKey(key: ApiKey): Observable<ApiKey> {
    return this.http.delete<ApiKey>(this.url(`api-keys/${key.id}`), this.ifMatch(key));
  }

  listWebhooks(): Observable<WebhookEndpoint[]> {
    return this.http.get<WebhookEndpoint[]>(this.url('webhooks'));
  }

  getWebhook(id: string): Observable<WebhookEndpoint> {
    return this.http.get<WebhookEndpoint>(this.url(`webhooks/${id}`));
  }

  listEventTypes(): Observable<WebhookEventType[]> {
    return this.http.get<WebhookEventType[]>(this.url('webhooks/event-types'));
  }

  createWebhook(input: WebhookInput): Observable<WebhookEndpoint> {
    return this.http.post<WebhookEndpoint>(this.url('webhooks'), input);
  }

  updateWebhook(
    endpoint: WebhookEndpoint,
    changes: Partial<WebhookInput & { is_active: boolean }>,
  ): Observable<WebhookEndpoint> {
    return this.http.patch<WebhookEndpoint>(
      this.url(`webhooks/${endpoint.id}`),
      changes,
      this.ifMatch(endpoint),
    );
  }

  removeWebhook(endpoint: WebhookEndpoint): Observable<void> {
    return this.http.delete<void>(this.url(`webhooks/${endpoint.id}`), this.ifMatch(endpoint));
  }

  listDeliveries(endpointId: string, limit = 50): Observable<WebhookDelivery[]> {
    const params = new HttpParams().set('limit', String(limit));
    return this.http.get<WebhookDelivery[]>(this.url(`webhooks/${endpointId}/deliveries`), {
      params,
    });
  }

  /** Queues a ping the worker sends within its interval. */
  testWebhook(endpointId: string): Observable<WebhookDelivery> {
    return this.http.post<WebhookDelivery>(this.url(`webhooks/${endpointId}/test`), {});
  }

  private ifMatch(record: { version: number }) {
    return { headers: { 'If-Match': String(record.version) } };
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
