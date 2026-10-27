import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriverApiService } from '../../core/api/driver-api.service';
import { DriverOperatorProfile } from '../../core/api/models/driver-account';

/** One operator the driver is linked with: what it holds about them, and leaving it. */
@Injectable()
export class OperatorStore {
  private readonly api = inject(DriverApiService);

  readonly profile = signal<DriverOperatorProfile | null>(null);
  readonly error = signal('');
  readonly isLeaving = signal(false);

  async load(tenantId: string): Promise<void> {
    this.error.set('');
    try {
      this.profile.set(await firstValueFrom(this.api.operatorProfile(tenantId)));
    } catch (error) {
      const problem = ApiProblem.from(error);
      this.error.set(
        problem.status === 404 ? 'You are not linked with this operator.' : problem.detail,
      );
    }
  }

  /** True when the link is gone and the page can leave too. */
  async leave(tenantId: string): Promise<boolean> {
    this.isLeaving.set(true);
    this.error.set('');
    try {
      await firstValueFrom(this.api.leave(tenantId));
      return true;
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
      return false;
    } finally {
      this.isLeaving.set(false);
    }
  }
}
