import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem, DriverCharge, DriverChargesApiService } from '@wattwisely/driver-core';
import { FileSaver } from '../../core/files/file-saver';

/** The driver's charges at every operator they are linked with (module 19), and the CSV of them. */
@Injectable()
export class MyChargesStore {
  private readonly api = inject(DriverChargesApiService);
  private readonly files = inject(FileSaver);

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

  /** Fetches the CSV with the login and hands it to the browser as a download. */
  async download(): Promise<void> {
    try {
      this.files.save(await firstValueFrom(this.api.export()), 'my-charges.csv');
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
