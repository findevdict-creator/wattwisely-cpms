import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriversApiService, DriversFilter } from '../../core/api/drivers-api.service';
import { Driver } from '../../core/api/models/driver';

/** The drivers list's data: loaded with its filters, more pages on request, reloaded after each change. */
@Injectable()
export class DriversStore {
  private readonly driversApi = inject(DriversApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly drivers = signal<Driver[]>([]);
  readonly nextCursor = signal<string | null>(null);
  readonly isLoading = signal(true);
  readonly filter = signal<DriversFilter>({});

  async load(filter: DriversFilter = this.filter()): Promise<void> {
    this.filter.set(filter);
    this.drivers.set([]);
    this.nextCursor.set(null);
    await this.loadMore();
  }

  async loadMore(): Promise<void> {
    this.isLoading.set(true);
    try {
      const page = await firstValueFrom(this.driversApi.list(this.filter(), this.nextCursor()));
      this.drivers.update((drivers) => [...drivers, ...page.items]);
      this.nextCursor.set(page.next_cursor);
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    } finally {
      this.isLoading.set(false);
    }
  }

  tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }
}
