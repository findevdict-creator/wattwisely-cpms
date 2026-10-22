import { Injectable } from '@nestjs/common';
import { ChargerPassword } from '@wattwisely/ocpp-contracts';
import { ChargerIdentity } from '../../storage/charger-identity';
import { UpgradeRefusal } from '../upgrade-refusal';
import { UpgradeRequest } from '../upgrade-request';

/**
 * A password charger must send HTTP Basic auth with its identity as user name and its
 * password (check 5). No-password chargers pass here; their fingerprint is checked at boot.
 */
@Injectable()
export class ChargerAuthCheck {
  static readonly CHALLENGE = { 'www-authenticate': 'Basic realm="ocpp"' };

  check(request: UpgradeRequest, charger: ChargerIdentity): void {
    if (charger.authMode !== 'password') {
      return;
    }
    const credentials = ChargerAuthCheck.parseBasic(request.authorization);
    const isUserRight = credentials?.user.toLowerCase() === charger.identity.toLowerCase();
    if (
      !credentials ||
      !isUserRight ||
      !ChargerPassword.matches(credentials.password, charger.passwordHash ?? '')
    ) {
      throw new UpgradeRefusal(401, 'bad_credentials', ChargerAuthCheck.CHALLENGE);
    }
  }

  private static parseBasic(header: string | null): { user: string; password: string } | null {
    const [scheme, encoded] = (header ?? '').split(' ');
    if (scheme?.toLowerCase() !== 'basic' || !encoded) {
      return null;
    }
    const decoded = Buffer.from(encoded, 'base64').toString('utf8');
    const separator = decoded.indexOf(':');
    return separator < 0
      ? null
      : { user: decoded.slice(0, separator), password: decoded.slice(separator + 1) };
  }
}
