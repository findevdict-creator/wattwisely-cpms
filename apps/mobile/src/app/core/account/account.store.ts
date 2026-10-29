import { Injectable, inject, signal } from '@angular/core';
import { ApiProblem, DriverApiService, DriverMe, DriverOperator } from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';

/**
 * The signed-in driver and the operators linked to them (module 19's API), shared by Home and
 * Account. Loaded when a tab opens; the last answer stays on screen while a new one comes.
 */
@Injectable({ providedIn: 'root' })
export class AccountStore {
  private readonly api = inject(DriverApiService);

  readonly me = signal<DriverMe | null>(null);
  readonly operators = signal<DriverOperator[]>([]);
  readonly error = signal('');

  async load(): Promise<void> {
    this.error.set('');
    try {
      const [me, operators] = await Promise.all([
        firstValueFrom(this.api.me()),
        firstValueFrom(this.api.operators()),
      ]);
      this.me.set(me);
      this.operators.set(operators.items);
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  /** Forgets the driver, so the next one to sign in on this phone does not see them. */
  clear(): void {
    this.me.set(null);
    this.operators.set([]);
    this.error.set('');
  }
}
