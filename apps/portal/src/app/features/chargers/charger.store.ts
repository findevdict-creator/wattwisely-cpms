import { Injectable, inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { ChargersApiService } from '../../core/api/chargers-api.service';
import { Charger, ChargerSetupCard, Connector } from '../../core/api/models/charger';

/** One charger page's data and the changes made from it; each change reloads the charger. */
@Injectable()
export class ChargerStore {
  private readonly chargersApi = inject(ChargersApiService);
  private readonly snackBar = inject(MatSnackBar);

  readonly charger = signal<Charger | null>(null);
  /** The setup card with a fresh password, shown until the page is left or reloaded. */
  readonly setup = signal<ChargerSetupCard | null>(null);
  readonly error = signal('');

  async load(id: string): Promise<void> {
    try {
      this.charger.set(await firstValueFrom(this.chargersApi.get(id)));
    } catch (error) {
      this.error.set(ApiProblem.from(error).detail);
    }
  }

  async setPassword(): Promise<void> {
    const result = await this.attempt(this.chargersApi.setPassword(this.current()));
    if (result) {
      this.charger.set(result.charger);
      this.setup.set(result.setup);
    }
  }

  async removePassword(): Promise<void> {
    const result = await this.attempt(this.chargersApi.removePassword(this.current()));
    if (result) {
      this.charger.set(result.charger);
      this.setup.set(result.setup);
      this.tell('Password removed. The charger is recognised by its first boot from now on.');
    }
  }

  async resetFingerprint(): Promise<void> {
    const charger = await this.attempt(this.chargersApi.resetFingerprint(this.current()));
    if (charger) {
      this.charger.set(charger);
      this.tell('Fingerprint forgotten. The next charger to boot with this ID claims it.');
    }
  }

  /** True when the charger is gone. */
  async remove(): Promise<boolean> {
    const charger = this.current();
    const isRemoved = await this.succeeds(this.chargersApi.remove(charger));
    if (isRemoved) {
      this.tell(`${charger.ocpp_identity} removed. Its ID is free again.`);
    }
    return Boolean(isRemoved);
  }

  async removeConnector(connector: Connector): Promise<void> {
    if (await this.succeeds(this.chargersApi.removeConnector(connector))) {
      this.tell(`Connector ${connector.label} removed.`);
      await this.load(this.current().id);
    }
  }

  tell(message: string): void {
    this.snackBar.open(message, 'OK', { duration: 6000 });
  }

  private current(): Charger {
    return this.charger() as Charger;
  }

  /** The request's answer, or undefined after telling the user what went wrong. */
  private async attempt<T>(request: Observable<T>): Promise<T | undefined> {
    try {
      return await firstValueFrom(request);
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
      return undefined;
    }
  }

  /** True when a request with an empty answer went through; tells the user otherwise. */
  private async succeeds(request: Observable<void>): Promise<boolean> {
    try {
      await firstValueFrom(request, { defaultValue: undefined });
      return true;
    } catch (error) {
      this.tell(ApiProblem.from(error).detail);
      return false;
    }
  }
}
