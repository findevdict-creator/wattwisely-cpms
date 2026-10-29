import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * The authenticator secrets the suite set up, by e-mail, kept in a file so every test process
 * can answer Keycloak's code prompt for a user whose set-up ran in another process.
 */
export class OtpSecrets {
  static readonly FILE = join(__dirname, '../../../../dist/e2e-results/.auth/otp-secrets.json');

  static get(email: string): string | undefined {
    return OtpSecrets.readAll()[email];
  }

  static put(email: string, secret: string): void {
    const all = OtpSecrets.readAll();
    all[email] = secret;
    mkdirSync(dirname(OtpSecrets.FILE), { recursive: true });
    writeFileSync(OtpSecrets.FILE, JSON.stringify(all, null, 2));
  }

  private static readAll(): Record<string, string> {
    return existsSync(OtpSecrets.FILE)
      ? (JSON.parse(readFileSync(OtpSecrets.FILE, 'utf8')) as Record<string, string>)
      : {};
  }
}
