import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { RuntimeConfig } from '../config/runtime-config';
import { ChargerCommand, CommandPage, OcppMessagePage } from './models/command';

/** Calls /v1/chargers/{id}/commands/*, /v1/commands and /v1/chargers/{id}/messages (module 4). */
@Injectable({ providedIn: 'root' })
export class CommandsApiService {
  static readonly RECENT = 20;

  private readonly http = inject(HttpClient);
  private readonly runtimeConfig = inject(RuntimeConfig);

  remoteStart(chargerId: string, connectorId: string): Observable<ChargerCommand> {
    return this.send(chargerId, 'remote-start', { connector_id: connectorId });
  }

  remoteStop(chargerId: string, sessionId: string): Observable<ChargerCommand> {
    return this.send(chargerId, 'remote-stop', { session_id: sessionId });
  }

  reset(chargerId: string, type: 'soft' | 'hard'): Observable<ChargerCommand> {
    return this.send(chargerId, 'reset', { type });
  }

  unlock(chargerId: string, connectorId: string): Observable<ChargerCommand> {
    return this.send(chargerId, 'unlock', { connector_id: connectorId });
  }

  /** Without a connector, the whole charger changes. */
  changeAvailability(
    chargerId: string,
    connectorId: string | null,
    isOperative: boolean,
  ): Observable<ChargerCommand> {
    return this.send(chargerId, 'change-availability', {
      ...(connectorId ? { connector_id: connectorId } : {}),
      operative: isOperative,
    });
  }

  get(commandId: string): Observable<ChargerCommand> {
    return this.http.get<ChargerCommand>(this.url(`commands/${commandId}`));
  }

  recentCommands(chargerId: string): Observable<CommandPage> {
    const params = new HttpParams().set('limit', CommandsApiService.RECENT);
    return this.http.get<CommandPage>(this.url(`chargers/${chargerId}/commands`), { params });
  }

  recentMessages(chargerId: string): Observable<OcppMessagePage> {
    const params = new HttpParams().set('limit', CommandsApiService.RECENT);
    return this.http.get<OcppMessagePage>(this.url(`chargers/${chargerId}/messages`), { params });
  }

  private send(chargerId: string, command: string, body: object): Observable<ChargerCommand> {
    return this.http.post<ChargerCommand>(
      this.url(`chargers/${chargerId}/commands/${command}`),
      body,
    );
  }

  private url(path: string): string {
    return `${this.runtimeConfig.apiUrl}/v1/${path}`;
  }
}
