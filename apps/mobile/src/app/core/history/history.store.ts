import { Injectable, inject, signal } from '@angular/core';
import { ApiProblem, DriverCharge, DriverChargesApiService } from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';
import { NativeFiles } from '../native/native-files';

/**
 * The driver's charges at every operator, newest first (module 19's API), for the Sessions
 * tab, and the same list as a CSV file to keep or send (module 33).
 */
@Injectable({ providedIn: 'root' })
export class HistoryStore {
  private readonly api = inject(DriverChargesApiService);
  private readonly files = inject(NativeFiles);

  readonly charges = signal<DriverCharge[]>([]);
  readonly isLoaded = signal(false);
  readonly error = signal('');

  async load(): Promise<void> {
    this.error.set('');
    try {
      this.charges.set((await firstValueFrom(this.api.charges())).items);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isLoaded.set(true);
    }
  }

  async shareCsv(): Promise<void> {
    this.error.set('');
    try {
      await this.files.share(await firstValueFrom(this.api.export()), 'my-charges.csv');
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** Forgets the driver's charges when they sign out. */
  clear(): void {
    this.charges.set([]);
    this.isLoaded.set(false);
    this.error.set('');
  }
}
