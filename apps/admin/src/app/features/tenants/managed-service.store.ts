import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ManagedServiceApiService } from '../../core/api/managed-service-api.service';
import {
  ManagedNoticeRequest,
  ManagedService,
  ManagedServiceTerms,
} from '../../core/api/models/managed-service';

/**
 * The managed service card's data: the tenant's latest agreement (none for a self-serve
 * tenant) and every change staff make to it. Each change reloads the agreement.
 */
@Injectable()
export class ManagedServiceStore {
  private readonly managedApi = inject(ManagedServiceApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly service = signal<ManagedService | null>(null);
  readonly isLoaded = signal(false);
  readonly error = signal('');
  private tenantId = '';

  async load(tenantId = this.tenantId): Promise<void> {
    this.tenantId = tenantId;
    try {
      this.service.set(await firstValueFrom(this.managedApi.get(tenantId)));
    } catch (error) {
      const problem = ApiProblem.from(error);
      this.service.set(null);
      this.error.set(problem.code === 'managed_service_not_found' ? '' : problem.detail);
    } finally {
      this.isLoaded.set(true);
    }
  }

  /** The agreement, which every change needs for its version. */
  current(): ManagedService {
    const service = this.service();
    if (!service) {
      throw new Error('The agreement is not loaded yet');
    }
    return service;
  }

  offer(terms: ManagedServiceTerms): Promise<void> {
    return this.change(this.managedApi.offer(this.tenantId, terms), 'Offer sent to the Owners.');
  }

  update(terms: ManagedServiceTerms): Promise<void> {
    return this.change(this.managedApi.update(this.current(), terms), 'Terms saved.');
  }

  withdraw(): Promise<void> {
    return this.change(this.managedApi.withdraw(this.current()), 'Offer withdrawn.');
  }

  giveNotice(request: ManagedNoticeRequest): Promise<void> {
    return this.change(this.managedApi.giveNotice(this.current(), request), 'Notice given.');
  }

  assignOperator(staffId: string): Promise<void> {
    const request = this.managedApi.assignOperator(this.tenantId, staffId);
    return this.change(request, 'Managed operator added.');
  }

  removeOperator(staffId: string): Promise<void> {
    const request = this.managedApi.removeOperator(this.tenantId, staffId);
    return this.change(request, 'Managed operator removed.');
  }

  private async change(request: Observable<unknown>, success: string): Promise<void> {
    try {
      await firstValueFrom(request, { defaultValue: undefined });
      this.snackBar.open(success, 'OK', { duration: 6000 });
      await this.load();
    } catch (error) {
      this.snackBar.open(ApiProblem.from(error).detail, 'OK', { duration: 6000 });
    }
  }
}
