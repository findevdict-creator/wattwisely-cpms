import { Injectable, inject } from '@angular/core';
import { ChargerEvent } from '../api/models/charger-event';
import { AuthService } from '../auth/auth.service';
import { RuntimeConfig } from '../config/runtime-config';
import { TenantContextService } from '../tenant/tenant-context.service';
import { LiveListener, LiveStream } from './live-stream';
import { SseParser } from './sse-parser';

/**
 * Opens GET /v1/chargers/{id}/live and hands every event to the listener. The stream
 * is read with fetch (EventSource cannot send the bearer token) and reopened after a
 * short pause whenever it drops, until `close` is called.
 */
@Injectable({ providedIn: 'root' })
export class ChargerLiveService {
  static readonly RETRY_MS = 3_000;

  private readonly authService = inject(AuthService);
  private readonly tenantContext = inject(TenantContextService);
  private readonly runtimeConfig = inject(RuntimeConfig);

  open(chargerId: string, listener: LiveListener): LiveStream {
    const controller = new AbortController();
    void this.readUntilClosed(chargerId, listener, controller.signal);
    return { close: () => controller.abort() };
  }

  private async readUntilClosed(chargerId: string, listener: LiveListener, signal: AbortSignal) {
    while (!signal.aborted) {
      try {
        await this.readOnce(chargerId, listener, signal);
      } catch {
        // The stream dropped (network, token refresh, API restart): reopen after a pause.
      }
      if (!signal.aborted) {
        await new Promise((resolve) => setTimeout(resolve, ChargerLiveService.RETRY_MS));
      }
    }
  }

  private async readOnce(chargerId: string, listener: LiveListener, signal: AbortSignal) {
    const response = await fetch(`${this.runtimeConfig.apiUrl}/v1/chargers/${chargerId}/live`, {
      headers: this.headers(),
      signal,
    });
    if (!response.ok || !response.body) {
      throw new Error(`Live stream answered ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const parser = new SseParser();
    for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
      for (const message of parser.push(decoder.decode(chunk.value, { stream: true }))) {
        ChargerLiveService.deliver(message.data, listener);
      }
    }
  }

  private static deliver(data: string, listener: LiveListener): void {
    if (!data) {
      return; // keep-alive
    }
    try {
      listener(JSON.parse(data) as ChargerEvent);
    } catch {
      // Not an event; ignore it.
    }
  }

  private headers(): Record<string, string> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.authService.accessToken()}`,
      Accept: 'text/event-stream',
    };
    const tenantId = this.tenantContext.currentTenantId();
    if (tenantId) {
      headers['X-Tenant-Id'] = tenantId;
    }
    return headers;
  }
}
