import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiProblem } from '../../core/api/api-problem';
import { DriverApiService } from '../../core/api/driver-api.service';
import { DriverInvitationPreview, DriverOperator } from '../../core/api/models/driver-account';

/** The invitation an operator's e-mail linked to, and the driver's answer to it (module 19). */
@Injectable()
export class InvitationStore {
  private readonly api = inject(DriverApiService);

  readonly invitation = signal<DriverInvitationPreview | null>(null);
  readonly isNotFound = signal(false);
  readonly isDeclined = signal(false);
  readonly error = signal('');
  readonly isAnswering = signal(false);

  async load(token: string): Promise<void> {
    this.error.set('');
    try {
      this.invitation.set(await firstValueFrom(this.api.invitation(token)));
    } catch (error) {
      const problem = ApiProblem.from(error);
      this.isNotFound.set(problem.status === 404);
      this.error.set(problem.status === 404 ? '' : problem.detail);
    }
  }

  /** The operator now linked, or null when the answer was refused. */
  async accept(token: string): Promise<DriverOperator | null> {
    return this.answer(async () => (await firstValueFrom(this.api.accept(token))).operator);
  }

  async decline(token: string): Promise<void> {
    await this.answer(async () => {
      await firstValueFrom(this.api.decline(token));
      this.isDeclined.set(true);
    });
  }

  private async answer<T>(work: () => Promise<T>): Promise<T | null> {
    this.isAnswering.set(true);
    this.error.set('');
    try {
      return await work();
    } catch (error) {
      this.error.set(InvitationStore.wordsFor(ApiProblem.from(error)));
      return null;
    } finally {
      this.isAnswering.set(false);
    }
  }

  static wordsFor(problem: ApiProblem): string {
    switch (problem.code) {
      case 'email_unverified':
        return 'Verify your e-mail address first: open the link in the e-mail Keycloak sent you, then come back to this page.';
      case 'invitation_for_someone_else':
        return 'This invitation was sent to another address. Log out and log in with the address it was sent to.';
      case 'invitation_expired':
        return 'This invitation has expired. Ask the operator to send a new one.';
      case 'account_already_linked':
        return 'Your login is already linked with this operator under another record. Ask the operator to sort it out.';
      default:
        return problem.detail;
    }
  }
}
