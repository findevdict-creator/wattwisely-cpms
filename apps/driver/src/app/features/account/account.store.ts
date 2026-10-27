import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriverApiService } from '../../core/api/driver-api.service';
import { DriverMe, DriverOperator } from '../../core/api/models/driver-account';

/** The driver's own account and the operators linked to it (module 19). */
@Injectable()
export class AccountStore {
  private readonly api = inject(DriverApiService);

  readonly me = signal<DriverMe | null>(null);
  readonly operators = signal<DriverOperator[]>([]);
  readonly error = signal('');
  readonly isSaving = signal(false);
  readonly isSaved = signal(false);

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
      this.error.set(AccountStore.wordsFor(ApiProblem.from(error)));
    }
  }

  async save(changes: { display_name: string; phone: string | null }): Promise<void> {
    this.isSaving.set(true);
    this.isSaved.set(false);
    this.error.set('');
    try {
      this.me.set(await firstValueFrom(this.api.updateMe(changes)));
      this.isSaved.set(true);
    } catch (error) {
      this.error.set(AccountStore.wordsFor(ApiProblem.from(error)));
    } finally {
      this.isSaving.set(false);
    }
  }

  /** The API's sentence, except for the one case the driver can do something about. */
  static wordsFor(problem: ApiProblem): string {
    if (problem.code === 'email_unverified') {
      return 'Verify your e-mail address first: open the link in the e-mail you were sent, then come back.';
    }
    return problem.detail;
  }
}
