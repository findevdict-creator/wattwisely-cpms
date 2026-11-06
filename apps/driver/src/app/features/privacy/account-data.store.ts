import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem, DriverApiService } from '@wattwisely/driver-core';
import { DriverAuthService } from '../../core/auth/driver-auth.service';
import { FileSaver } from '../../core/files/file-saver';

/**
 * "Privacy and data" behind the page (module 38, as the mobile app's of module 33):
 * everything held about the driver as a JSON file, and deleting the account. The API erases
 * the account, its cards and the guest records it made; Keycloak's own page then deletes the
 * login.
 */
@Injectable()
export class AccountDataStore {
  static readonly FILE_NAME = 'my-wattwisely-data.json';

  private readonly api = inject(DriverApiService);
  private readonly auth = inject(DriverAuthService);
  private readonly files = inject(FileSaver);

  readonly isBusy = signal(false);
  readonly error = signal('');

  async download(): Promise<void> {
    await this.attempt(async () => {
      this.files.save(await firstValueFrom(this.api.exportData()), AccountDataStore.FILE_NAME);
    });
  }

  async delete(): Promise<void> {
    await this.attempt(async () => {
      await firstValueFrom(this.api.deleteMe());
      this.auth.deleteLogin();
    });
  }

  private async attempt(work: () => Promise<void>): Promise<void> {
    this.isBusy.set(true);
    this.error.set('');
    try {
      await work();
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    } finally {
      this.isBusy.set(false);
    }
  }
}
