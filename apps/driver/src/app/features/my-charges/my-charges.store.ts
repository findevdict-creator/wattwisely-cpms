import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriverChargesApiService } from '../../core/api/driver-charges-api.service';
import { DriverCharge } from '../../core/api/models/driver-payments';

/** The driver's charges at every operator they are linked with (module 19), and the CSV of them. */
@Injectable()
export class MyChargesStore {
  private readonly api = inject(DriverChargesApiService);

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
      const file = await firstValueFrom(this.api.export());
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'my-charges.csv';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }
}
