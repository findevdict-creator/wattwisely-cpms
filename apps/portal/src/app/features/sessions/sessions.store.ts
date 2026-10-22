import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Session, SessionFilter } from '../../core/api/models/session';
import { SessionsApiService } from '../../core/api/sessions-api.service';

/** The sessions list's data: newest first, a page at a time, reloaded when a filter changes. */
@Injectable()
export class SessionsStore {
  private readonly sessionsApi = inject(SessionsApiService);

  readonly sessions = signal<Session[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly filter = signal<SessionFilter>({});
  readonly isLoading = signal(false);
  readonly error = signal('');

  async load(filter: SessionFilter = this.filter()): Promise<void> {
    this.filter.set(filter);
    this.sessions.set([]);
    this.nextCursor.set(null);
    await this.loadMore();
  }

  async loadMore(): Promise<void> {
    this.isLoading.set(true);
    try {
      const page = await firstValueFrom(this.sessionsApi.list(this.filter(), this.nextCursor()));
      this.sessions.update((sessions) => [...sessions, ...page.items]);
      this.nextCursor.set(page.next_cursor);
      this.error.set('');
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoading.set(false);
    }
  }

  /** Downloads the filtered sessions as sessions.csv. */
  async export(): Promise<void> {
    try {
      const csv = await firstValueFrom(this.sessionsApi.exportCsv(this.filter()));
      const link = document.createElement('a');
      link.href = URL.createObjectURL(csv);
      link.download = 'sessions.csv';
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
