import { Injectable, inject, signal } from '@angular/core';
import { ApiProblem, DriverApiService } from '@wattwisely/driver-core';
import { firstValueFrom } from 'rxjs';
import { SignOut } from '../auth/sign-out';
import { NativeFiles } from '../native/native-files';

/**
 * "Privacy and data" behind the page (module 33): everything held about the driver as a
 * JSON file, and deleting the account. The API erases the account, its cards and the guest
 * records it made; Keycloak's own page then deletes the login.
 */
@Injectable({ providedIn: 'root' })
export class AccountData {
  static readonly FILE_NAME = 'my-wattwisely-data.json';

  private readonly api = inject(DriverApiService);
  private readonly files = inject(NativeFiles);
  private readonly signOut = inject(SignOut);

  readonly isBusy = signal(false);
  readonly error = signal('');

  async download(): Promise<void> {
    await this.attempt(async () => {
      await this.files.share(await firstValueFrom(this.api.exportData()), AccountData.FILE_NAME);
    });
  }

  async delete(): Promise<void> {
    await this.attempt(async () => {
      await firstValueFrom(this.api.deleteMe());
      await this.signOut.run(true);
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
