import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Session, SessionFilter } from '../../core/api/models/session';
import { ReportsApiService } from '../../core/api/reports-api.service';
import { SessionsApiService } from '../../core/api/sessions-api.service';
import { FileDownload } from '../../shared/file-download';

/** The sessions list's data: newest first, a page at a time, reloaded when a filter changes. */
@Injectable()
export class SessionsStore {
  private readonly sessionsApi = inject(SessionsApiService);
  private readonly reportsApi = inject(ReportsApiService);

  readonly sessions = signal<Session[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly filter = signal<SessionFilter>({});
  readonly isLoading = signal(false);
  readonly error = signal('');
  /** Set when a large export went to the background instead. */
  readonly notice = signal('');

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

  /**
   * Downloads the filtered sessions as sessions.csv. Too many rows for a direct download
   * (422) become a background export, ready later on the Reports page and by e-mail.
   */
  async export(): Promise<void> {
    this.notice.set('');
    try {
      FileDownload.save(
        await firstValueFrom(this.sessionsApi.exportCsv(this.filter())),
        'sessions.csv',
      );
    } catch (error) {
      if (
        error instanceof HttpErrorResponse &&
        error.status === HttpStatusCode.UnprocessableEntity
      ) {
        await this.exportInBackground();
      } else {
        this.error.set(ApiProblem.from(error).detail);
      }
    }
  }

  private async exportInBackground(): Promise<void> {
    try {
      await firstValueFrom(this.reportsApi.createExport({ kind: 'sessions', ...this.filter() }));
      this.notice.set(
        'That is too many sessions to download at once, so the file is being built in the background. ' +
          'You will get an e-mail, and it will be on the Reports page, when it is ready.',
      );
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
