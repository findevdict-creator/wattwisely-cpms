import { Injectable, inject } from '@angular/core';
import { CanActivate } from '@angular/router';
import { UserLoaderService } from './user-loader.service';

/** Makes sure the user's details are loaded before pages such as the tenant picker open. */
@Injectable({ providedIn: 'root' })
export class UserLoadedGuard implements CanActivate {
  private readonly userLoader = inject(UserLoaderService);

  async canActivate(): Promise<boolean> {
    await this.userLoader.ensureLoaded();
    return true;
  }
}
