import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ChargerEvent } from '../../core/api/models/charger-event';
import { SessionDetail, SessionReading } from '../../core/api/models/session';
import { SessionsApiService } from '../../core/api/sessions-api.service';
import { ChargerLiveService } from '../../core/live/charger-live.service';
import { LiveStream } from '../../core/live/live-stream';

/**
 * One session's data. While the session is open it follows the charger's live stream
 * and reloads when this session changes or its cost so far is updated.
 */
@Injectable()
export class SessionStore implements OnDestroy {
  static readonly END_STATES = ['completed', 'not_started', 'failed'];

  private readonly sessionsApi = inject(SessionsApiService);
  private readonly live = inject(ChargerLiveService);
  private stream: LiveStream | null = null;

  readonly session = signal<SessionDetail | null>(null);
  readonly readings = signal<SessionReading[]>([]);

  async load(id: string): Promise<void> {
    const [session, readings] = await Promise.all([
      firstValueFrom(this.sessionsApi.get(id)),
      firstValueFrom(this.sessionsApi.readings(id)),
    ]);
    this.session.set(session);
    this.readings.set(readings);
  }

  /** Follows the charger's live events until the session ends or the page closes. */
  follow(id: string, chargerId: string): void {
    this.stream?.close();
    this.stream = this.live.open(chargerId, (event: ChargerEvent) => {
      if (event.data['session_id'] === id) {
        void this.load(id).then(() => this.stopWhenEnded());
      }
    });
  }

  async close(id: string): Promise<void> {
    this.session.set(await firstValueFrom(this.sessionsApi.close(id)));
    this.stopWhenEnded();
  }

  isEnded(): boolean {
    return SessionStore.END_STATES.includes(this.session()?.status ?? '');
  }

  ngOnDestroy(): void {
    this.stream?.close();
  }

  private stopWhenEnded(): void {
    if (this.isEnded()) {
      this.stream?.close();
      this.stream = null;
    }
  }
}
