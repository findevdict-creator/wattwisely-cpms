import { Injectable } from '@nestjs/common';
import { OcppVersion, OcppVersions } from '@wattwisely/ocpp-contracts';
import { ChargerIdentity } from '../../storage/charger-identity';
import { UpgradeRefusal } from '../upgrade-refusal';
import { UpgradeRequest } from '../upgrade-request';

/**
 * Picks the OCPP version from Sec-WebSocket-Protocol (check 4). The charger lists the
 * subprotocols it speaks in its order of preference; the first one the gateway speaks
 * too wins (1.6 and, since module 18, 2.0.1). A charger that offers none is taken at the
 * version it was last seen speaking; one that offers only versions the gateway lacks, or
 * none and was never seen, is refused.
 */
@Injectable()
export class VersionCheck {
  check(request: UpgradeRequest, charger: ChargerIdentity): OcppVersion {
    for (const protocol of request.protocols) {
      const version = OcppVersions.fromSubprotocol(protocol);
      if (version) {
        return version;
      }
    }
    if (request.protocols.length === 0 && charger.ocppVersion) {
      return charger.ocppVersion;
    }
    throw new UpgradeRefusal(400, 'unsupported_protocol');
  }
}
