import { join } from 'node:path';

/** Where the setup project keeps each user's signed-in browser state, per app. */
export class AuthStates {
  static readonly DIR = join(__dirname, '../../../../dist/e2e-results/.auth');

  static of(app: 'portal' | 'admin' | 'driver' | 'mobile', email: string): string {
    return join(AuthStates.DIR, `${app}-${email.replace(/[^a-z0-9]+/gi, '-')}.json`);
  }
}
