import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { Site } from '../../core/api/models/site';
import { SitesApiService } from '../../core/api/sites-api.service';

/** The filters of the sites list. */
export interface SitesFilter {
  q?: string;
  visibility?: string;
  status?: string;
}

/** The sites list's data: loaded with its filters, reloaded after each change. */
@Injectable()
export class SitesStore {
  private readonly sitesApi = inject(SitesApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly sites = signal<Site[]>([]);
  readonly isLoading = signal(true);
  readonly filter = signal<SitesFilter>({});

  async load(filter: SitesFilter = this.filter()): Promise<void> {
    this.filter.set(filter);
    this.isLoading.set(true);
    try {
      const page = await firstValueFrom(this.sitesApi.list(filter));
      const status = filter.status;
      this.sites.set(status ? page.items.filter((site) => site.status === status) : page.items);
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
    } finally {
      this.isLoading.set(false);
    }
  }

  async remove(site: Site): Promise<boolean> {
    try {
      await firstValueFrom(this.sitesApi.remove(site), { defaultValue: undefined });
      this.tell(`${site.name} removed.`);
      await this.load();
      return true;
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
      return false;
    }
  }

  tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }
}
