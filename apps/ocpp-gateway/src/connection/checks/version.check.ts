import { Injectable } from '@nestjs/common';
import { ChargerIdentity } from '../../storage/charger-identity';
import { UpgradeRefusal } from '../upgrade-refusal';
import { UpgradeRequest } from '../upgrade-request';

/**
 * Picks the OCPP version from Sec-WebSocket-Protocol (check 4). M1 speaks 1.6 only:
 * a charger offering just ocpp2.0.1 is refused. A charger that offers no protocol at
 * all is accepted as 1.6 only when it was already seen speaking 1.6.
 */
@Injectable()
export class VersionCheck {
  static readonly OCPP16 = 'ocpp1.6';
  static readonly OCPP201 = 'ocpp2.0.1';

  check(request: UpgradeRequest, charger: ChargerIdentity): void {
    if (request.protocols.includes(VersionCheck.OCPP16)) {
      return;
    }
    if (request.protocols.length === 0 && charger.ocppVersion === '1.6') {
      return;
    }
    throw new UpgradeRefusal(400, 'unsupported_protocol');
  }
}
